package com.msfamily.app

import android.util.Log
import java.util.regex.Pattern

data class ParsedTransaction(
    val amount: Double,
    val transactionType: String, // "income" or "expense"
    val bankName: String,
    val accountNumber: String?,
    val merchantName: String?,
    val balance: Double?,
    val upiId: String?,
    val referenceNumber: String?,
    val suggestedCategory: String,
    val confidence: Double
)

/**
 * Native SMS Parser Engine — robust regex-based Indian bank SMS parser.
 * 
 * Fixes applied:
 * - Added 25+ missing bank patterns (CUB, IOB, TMB, KVB, Bandhan, etc.)
 * - Improved amount extraction with ₹ symbol, comma-separated formats, balance penalty
 * - Improved merchant extraction with more patterns
 * - Added sender-based bank detection (DLT prefix stripping)
 * - Added confidence boosting for additional fields
 * - Comprehensive logging for debugging
 */
object SmsParserEngine {

    private const val TAG = "SmsParserEngine"

    // Regex for transaction indicators
    private val DEBIT_KEYWORDS = Pattern.compile(
        "(?i)(debited|spent|paid|withdrawn|charged|sent|transfer(?:red)?\\s+to|deducted|remitted|dr|emi\\s+(?:paid|deducted)|used\\s+at|purchased?|auto.?debit|cash\\s+withdraw|atm\\s+withdraw)"
    )
    private val CREDIT_KEYWORDS = Pattern.compile(
        "(?i)(credited|received|added|deposited|transferred\\s+from|trf\\s+from|refunded?|cr|salary|stipend|cashback|reversed?|reversal|dividend|interest\\s+credit|added\\s+to.*wallet)"
    )
    
    // OTP and Spam keywords
    private val OTP_KEYWORDS = Pattern.compile(
        "(?i)(otp|verification code|one time password|login\\s+attempt|auth|security code|verification token|code is|verify\\s+your|dear\\s+customer.*otp)"
    )
    private val PROMO_KEYWORDS = Pattern.compile(
        "(?i)(apply now|loan up to|offer(?:ing)?|discount|win cash|credit card limit|click to apply|claim your|free|pre-approved|eligible|interest rate|click\\s+here|limited\\s+time|win\\s+up\\s+to|congratulations?.*won|get\\s+\\d+%\\s+off)"
    )

    // Comprehensive bank detection — sender code → bank name
    private val SENDER_BANK_MAP = mapOf(
        "SBIINB" to "SBI", "SBIIN" to "SBI", "SBIUPI" to "SBI", "SBIPSG" to "SBI",
        "SBIBNK" to "SBI", "SBICRD" to "SBI", "ATMSBI" to "SBI", "SBILIN" to "SBI",
        "SBISMS" to "SBI", "SBIALR" to "SBI",
        "HDFCBK" to "HDFC Bank", "HDFCB" to "HDFC Bank", "HDFCBN" to "HDFC Bank",
        "HDFCCC" to "HDFC Bank", "HDFCSM" to "HDFC Bank",
        "ICICIB" to "ICICI Bank", "ICICBA" to "ICICI Bank", "ICICIS" to "ICICI Bank",
        "ICICI" to "ICICI Bank", "ICINBK" to "ICICI Bank",
        "AXISBK" to "Axis Bank", "AXISB" to "Axis Bank", "AXISMS" to "Axis Bank",
        "KOTAKB" to "Kotak Bank", "KOTAK" to "Kotak Bank", "KOTKSM" to "Kotak Bank",
        "CANBNK" to "Canara Bank", "CNRBIN" to "Canara Bank", "CANARA" to "Canara Bank",
        "CANBK" to "Canara Bank", "CNRBSM" to "Canara Bank", "CNRBK" to "Canara Bank",
        "CUBINB" to "City Union Bank", "CUBANK" to "City Union Bank", "CUBSMS" to "City Union Bank",
        "CITYUN" to "City Union Bank", "CUBNKM" to "City Union Bank",
        "INDIANB" to "Indian Bank", "INDBNK" to "Indian Bank", "INDBSM" to "Indian Bank",
        "IDNBNK" to "Indian Bank", "INDIANBK" to "Indian Bank", "INDNBK" to "Indian Bank",
        "BOBIN" to "Bank of Baroda", "BOBSMS" to "Bank of Baroda", "BOBIBN" to "Bank of Baroda",
        "PNBSMS" to "PNB", "PUNJNB" to "PNB", "PNBALR" to "PNB",
        "UNIONB" to "Union Bank", "UBIINB" to "Union Bank",
        "IDFCFB" to "IDFC First Bank", "IDFCB" to "IDFC First Bank",
        "YESBK" to "YES Bank", "YESBNK" to "YES Bank",
        "INDUSB" to "IndusInd Bank", "INDUSL" to "IndusInd Bank",
        "FEDBNK" to "Federal Bank", "FEDBNL" to "Federal Bank",
        "RBLBNK" to "RBL Bank",
        "BANDHN" to "Bandhan Bank",
        "AUSFIN" to "AU Small Finance",
        "IOBSMS" to "IOB", "IOBBNK" to "IOB", "IOBBK" to "IOB",
        "CENTBK" to "Central Bank",
        "UCOBNK" to "UCO Bank",
        "MAHABK" to "Bank of Maharashtra",
        "TMBSMS" to "Tamilnad Mercantile Bank", "TMBBNK" to "Tamilnad Mercantile Bank",
        "KVBSMS" to "Karur Vysya Bank", "KVBANK" to "Karur Vysya Bank",
        "DLBBNK" to "Dhanlaxmi Bank",
        "JSBANK" to "J&K Bank",
        "PAYTM" to "Paytm", "PYTM" to "Paytm", "PAYTMB" to "Paytm",
        "GPAY" to "Google Pay", "GOOGPE" to "Google Pay",
        "PHONPE" to "PhonePe", "PHNEPE" to "PhonePe",
        "AMAZON" to "Amazon Pay",
        "BAJFIN" to "Bajaj Finance",
        "UJJIVN" to "Ujjivan SFB",
        "CSFIN" to "Capital Small Finance"
    )

    // Body-based bank detection
    private val BANK_PATTERNS = mapOf(
        "SBI" to Pattern.compile("(?i)(\\bsbi\\b|state bank of india)"),
        "HDFC Bank" to Pattern.compile("(?i)(\\bhdfc\\b)"),
        "ICICI Bank" to Pattern.compile("(?i)(\\bicici\\b)"),
        "Axis Bank" to Pattern.compile("(?i)(\\baxis\\s*bank\\b)"),
        "Kotak Bank" to Pattern.compile("(?i)(\\bkotak\\b)"),
        "Canara Bank" to Pattern.compile("(?i)(\\bcanara\\b)"),
        "City Union Bank" to Pattern.compile("(?i)(\\bcity\\s*union\\b|\\bcub\\b)"),
        "Indian Bank" to Pattern.compile("(?i)(\\bindian\\s*bank\\b)"),
        "Union Bank" to Pattern.compile("(?i)(\\bunion\\s*bank\\b)"),
        "PNB" to Pattern.compile("(?i)(\\bpnb\\b|punjab\\s*national)"),
        "Bank of Baroda" to Pattern.compile("(?i)(\\bbank\\s*of\\s*baroda\\b|\\bbob\\b)"),
        "IDFC First Bank" to Pattern.compile("(?i)(\\bidfc\\b)"),
        "YES Bank" to Pattern.compile("(?i)(\\byes\\s*bank\\b)"),
        "IndusInd Bank" to Pattern.compile("(?i)(\\bindusind\\b)"),
        "Federal Bank" to Pattern.compile("(?i)(\\bfederal\\s*bank\\b)"),
        "RBL Bank" to Pattern.compile("(?i)(\\brbl\\s*bank\\b)"),
        "Bandhan Bank" to Pattern.compile("(?i)(\\bbandhan\\b)"),
        "IOB" to Pattern.compile("(?i)(\\biob\\b|indian\\s*overseas)"),
        "Central Bank" to Pattern.compile("(?i)(\\bcentral\\s*bank\\b)"),
        "UCO Bank" to Pattern.compile("(?i)(\\buco\\s*bank\\b)"),
        "Bank of Maharashtra" to Pattern.compile("(?i)(\\bbank\\s*of\\s*maharashtra\\b)"),
        "Tamilnad Mercantile Bank" to Pattern.compile("(?i)(\\btmb\\b|tamilnad\\s*mercantile)"),
        "Karur Vysya Bank" to Pattern.compile("(?i)(\\bkvb\\b|karur\\s*vysya)"),
        "AU Small Finance" to Pattern.compile("(?i)(\\bau\\s*(small\\s*)?finance\\b)"),
        "Paytm" to Pattern.compile("(?i)(\\bpaytm\\b)"),
        "PhonePe" to Pattern.compile("(?i)(\\bphonepe\\b)"),
        "Google Pay" to Pattern.compile("(?i)(\\bgpay\\b|google\\s*pay)"),
        "Amazon Pay" to Pattern.compile("(?i)(\\bamazon\\s*pay\\b)"),
        "Bajaj Finance" to Pattern.compile("(?i)(\\bbajaj\\s*fin)")
    )

    // UPI VPA domain → bank name
    private val UPI_DOMAIN_BANK = mapOf(
        "oksbi" to "SBI", "okaxis" to "Axis Bank", "okicici" to "ICICI Bank",
        "okhdfcbank" to "HDFC Bank", "ybl" to "YES Bank", "upi" to "UPI",
        "paytm" to "Paytm", "ibl" to "IDFC First Bank", "kotak" to "Kotak Bank",
        "axisbank" to "Axis Bank", "hdfcbank" to "HDFC Bank", "sbi" to "SBI",
        "icici" to "ICICI Bank", "federal" to "Federal Bank", "rbl" to "RBL Bank",
        "indus" to "IndusInd Bank", "pnb" to "PNB", "canara" to "Canara Bank",
        "bob" to "Bank of Baroda", "unionbank" to "Union Bank",
        "aubank" to "AU Small Finance", "jupiteraxis" to "Jupiter/Axis"
    )

    fun parse(sender: String, body: String): ParsedTransaction? {
        val cleanBody = body.trim().replace("\n", " ").replace("\r", " ")
        Log.d(TAG, "━━━ PARSING SMS ━━━")
        Log.d(TAG, "  Sender: $sender")
        Log.d(TAG, "  Body: ${cleanBody.take(100)}...")

        // 1. Spam & OTP Filtering
        if (OTP_KEYWORDS.matcher(cleanBody).find()) {
            Log.d(TAG, "  ⏭ Rejected: OTP/verification message")
            return null
        }
        
        // Ensure there are transaction indicators
        val hasDebit = DEBIT_KEYWORDS.matcher(cleanBody).find()
        val hasCredit = CREDIT_KEYWORDS.matcher(cleanBody).find()
        if (!hasDebit && !hasCredit) {
            Log.d(TAG, "  ⏭ Rejected: No transaction keywords found")
            return null
        }

        // Promotional check — only reject if no amount indicator present
        if (PROMO_KEYWORDS.matcher(cleanBody).find() && 
            !cleanBody.contains("Rs.", true) && !cleanBody.contains("INR", true) && !cleanBody.contains("₹")) {
            Log.d(TAG, "  ⏭ Rejected: Promotional message")
            return null
        }

        // 2. Extract Amount (with balance penalty)
        val amount = extractAmount(cleanBody)
        if (amount == null) {
            Log.d(TAG, "  ⏭ Rejected: No valid amount found")
            return null
        }
        Log.d(TAG, "  💰 Amount: $amount")

        // 3. Detect Bank Name (sender-first, then body)
        val bankName = detectBank(sender, cleanBody)
        Log.d(TAG, "  🏦 Bank: $bankName")

        // 4. Transaction Type
        val transactionType = determineType(cleanBody)
        Log.d(TAG, "  📊 Type: $transactionType")

        // 5. Account/Card Last 4 digits
        val accountNumber = extractAccountNumber(cleanBody)
        Log.d(TAG, "  💳 Account: ${accountNumber ?: "N/A"}")

        // 6. UPI ID / VPA
        val upiId = extractUpiId(cleanBody)

        // 7. Reference Number
        val referenceNumber = extractReferenceNumber(cleanBody)
        Log.d(TAG, "  🔗 Ref: ${referenceNumber ?: "N/A"}")

        // 8. Merchant Name
        val merchantName = extractMerchant(cleanBody, upiId)
        Log.d(TAG, "  🏪 Merchant: ${merchantName ?: "N/A"}")

        // 9. Balance
        val balance = extractBalance(cleanBody)

        // 10. Intelligent Category Classification
        val suggestedCategory = classifyCategory(cleanBody, merchantName, transactionType)
        Log.d(TAG, "  🏷️ Category: $suggestedCategory")

        // Confidence Score Calculation
        var confidence = 0.5
        if (bankName != "Unknown Bank") confidence += 0.15
        if (accountNumber != null) confidence += 0.1
        if (referenceNumber != null) confidence += 0.1
        if (merchantName != null) confidence += 0.08
        if (balance != null) confidence += 0.05
        if (upiId != null) confidence += 0.02
        confidence = confidence.coerceAtMost(1.0)
        Log.d(TAG, "  🎯 Confidence: ${"%.2f".format(confidence)}")
        Log.d(TAG, "━━━ PARSE COMPLETE ━━━")

        return ParsedTransaction(
            amount = amount,
            transactionType = transactionType,
            bankName = bankName,
            accountNumber = accountNumber,
            merchantName = merchantName,
            balance = balance,
            upiId = upiId,
            referenceNumber = referenceNumber,
            suggestedCategory = suggestedCategory,
            confidence = confidence
        )
    }

    private fun extractAmount(body: String): Double? {
        data class AmountCandidate(val value: Double, val score: Int, val context: String)
        val candidates = mutableListOf<AmountCandidate>()

        // Pattern set with contextual scores (higher = more confident)
        val patterns = listOf(
            // Highest confidence: explicit Rs/INR/₹ prefix immediately before number
            Pattern.compile("(?i)(?:rs\\.?|inr|₹)\\s*([\\d,]+\\.?\\d*)") to 10,
            // Number immediately after transaction verb
            Pattern.compile("(?i)(?:debited|credited|spent|received|paid|withdrawn|deposited|transferred|deducted|charged)\\s+(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)") to 9,
            // "amount of Rs X" pattern
            Pattern.compile("(?i)amount\\s+(?:of\\s+)?(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)") to 9,
            // "for Rs X" pattern
            Pattern.compile("(?i)for\\s+(?:rs\\.?|inr|₹)\\s*([\\d,]+\\.?\\d*)") to 8,
            // Number + Rs suffix
            Pattern.compile("(?i)([\\d,]+\\.?\\d*)\\s*(?:rs\\.?|inr|rupees)") to 7,
            // Any decimal number as fallback
            Pattern.compile("([\\d,]+\\.\\d{2})\\b") to 4
        )

        for ((pattern, score) in patterns) {
            val matcher = pattern.matcher(body)
            while (matcher.find()) {
                val amtStr = matcher.group(1)?.replace(",", "") ?: continue
                try {
                    val value = amtStr.toDouble()
                    if (value > 0.5 && value < 50_000_000) {
                        // Balance penalty — reduce score if preceded by "bal"/"balance"/"avl"
                        val startIdx = maxOf(0, matcher.start() - 20)
                        val preContext = body.substring(startIdx, matcher.start()).lowercase()
                        val balPenalty = if (preContext.contains("bal") || preContext.contains("balance") || preContext.contains("avl")) -4 else 0
                        candidates.add(AmountCandidate(value, score + balPenalty, preContext))
                    }
                } catch (e: NumberFormatException) {
                    continue
                }
            }
        }

        if (candidates.isEmpty()) return null

        // Sort by score desc, then by value asc (prefer smaller = likely transaction amount not balance)
        candidates.sortWith(compareByDescending<AmountCandidate> { it.score }.thenBy { it.value })
        return String.format("%.2f", candidates[0].value).toDouble()
    }

    private fun detectBank(sender: String, body: String): String {
        // 1. Sender ID match — strip DLT prefix (VM-, AD-, JD-, etc.)
        val stripped = sender.uppercase().replace(Regex("^[A-Z]{2}-"), "").replace(Regex("^[+\\-\\d]+"), "")
        
        // Exact match first
        SENDER_BANK_MAP[stripped]?.let { return it }
        
        // Partial match
        for ((key, name) in SENDER_BANK_MAP) {
            if (stripped.contains(key)) return name
        }

        // 2. Body keyword scan
        for ((bank, pattern) in BANK_PATTERNS) {
            if (pattern.matcher(body).find()) return bank
        }

        // 3. UPI VPA domain-based detection
        val vpaMatch = Regex("(?i)[\\w.\\-]+@([\\w.]+)").find(body.lowercase())
        if (vpaMatch != null) {
            val domain = vpaMatch.groupValues[1]
            for ((d, bank) in UPI_DOMAIN_BANK) {
                if (domain.contains(d)) return bank
            }
        }

        // 4. Fallback: extract prefix from sender (e.g. VK-HDFCBK -> HDFCBK)
        val parts = sender.split("-")
        if (parts.size > 1) {
            val code = parts[1].uppercase()
            if (code.length >= 3) return code
        }
        return "Unknown Bank"
    }

    private fun determineType(body: String): String {
        val debitMatcher = DEBIT_KEYWORDS.matcher(body)
        val creditMatcher = CREDIT_KEYWORDS.matcher(body)

        val hasDebit = debitMatcher.find()
        val hasCredit = creditMatcher.find()

        if (hasCredit && !hasDebit) return "income"
        if (hasDebit && !hasCredit) return "expense"

        if (hasDebit && hasCredit) {
            // Check which keyword occurs first — the first one is usually the primary intent
            val debitIdx = body.indexOf(debitMatcher.group(0) ?: "")
            val creditIdx = body.indexOf(creditMatcher.group(0) ?: "")
            if (creditIdx < debitIdx) return "income"
        }
        
        return "expense"
    }

    private fun extractAccountNumber(body: String): String? {
        val patterns = listOf(
            Pattern.compile("(?i)a/c\\s*(?:no\\.?\\s*)?[x*#-]*(\\d{4})"),
            Pattern.compile("(?i)(?:acct|account)\\s*(?:no\\.?\\s*)?[x*#-]*(\\d{4})"),
            Pattern.compile("(?i)card\\s*(?:no\\.?\\s*)?(?:ending\\s*)?[x*#-]*(\\d{4})"),
            Pattern.compile("(?i)ending\\s+(?:with\\s+)?[x*]*(\\d{4})"),
            Pattern.compile("(?i)linked\\s+(?:to\\s+)?[x*]*(\\d{4})"),
            Pattern.compile("[xX*#]{2,}(\\d{4})\\b"),
            Pattern.compile("(?i)(?:a/c|acct|account)\\s*(?:no\\.?\\s*)?(\\d{8,16})")
        )
        for (pattern in patterns) {
            val matcher = pattern.matcher(body)
            if (matcher.find()) {
                val match = matcher.group(1) ?: continue
                return match.takeLast(4)
            }
        }
        return null
    }

    private fun extractUpiId(body: String): String? {
        val pattern = Pattern.compile("(?i)(?:upi|vpa)\\s*[:-]?\\s*([a-zA-Z0-9.\\-_]+@[a-zA-Z0-9.\\-_]+)")
        val matcher = pattern.matcher(body)
        if (matcher.find()) {
            return matcher.group(1)
        }
        // Also try to find any VPA-like pattern
        val fallback = Pattern.compile("([a-zA-Z0-9.\\-_]+@(?:oksbi|okicici|okaxis|okhdfcbank|ybl|upi|paytm|ibl|kotak|axisbank|hdfcbank|sbi|icici|federal|rbl|indus|pnb|canara|bob|unionbank|aubank))")
        val matcher2 = fallback.matcher(body.lowercase())
        if (matcher2.find()) {
            return matcher2.group(1)
        }
        return null
    }

    private fun extractReferenceNumber(body: String): String? {
        val patterns = listOf(
            Pattern.compile("(?i)(?:upi\\s*ref\\s*(?:no\\.?)?\\s*[:-]?\\s*)(\\d{6,20})"),
            Pattern.compile("(?i)(?:ref(?:erence)?\\s*(?:no\\.?|#|number)?\\s*[:-]?\\s*)(\\w{6,22})"),
            Pattern.compile("(?i)(?:txn\\s*(?:id|no\\.?|#)?\\s*[:-]?\\s*)(\\w{6,22})"),
            Pattern.compile("(?i)(?:transaction\\s*(?:id|no\\.?)?\\s*[:-]?\\s*)(\\w{6,22})"),
            Pattern.compile("(?i)(?:utr\\s*(?:no\\.?)?\\s*[:-]?\\s*)(\\w{6,22})"),
            Pattern.compile("(?i)(?:rrn\\s*[:-]?\\s*)(\\d{6,20})"),
            Pattern.compile("(?i)(?:imps\\s*ref\\s*[:-]?\\s*)(\\d{6,20})"),
            Pattern.compile("(?i)(?:neft\\s*ref\\s*[:-]?\\s*)(\\w{6,22})")
        )
        for (pattern in patterns) {
            val matcher = pattern.matcher(body)
            if (matcher.find()) {
                val ref = matcher.group(1)
                if (ref != null && ref.length >= 6) return ref
            }
        }
        return null
    }

    private fun extractMerchant(body: String, upiId: String?): String? {
        // Strategy 1: VPA-based merchant
        if (upiId != null) {
            val prefix = upiId.split("@")[0]
            if (prefix.isNotEmpty() && !prefix.contains("ref", true) && 
                !Regex("^\\d+$").matches(prefix) && prefix.length > 2) {
                return toTitleCase(prefix.replace("[._-]".toRegex(), " "))
            }
        }

        // Strategy 2: "paid to / sent to / transferred to <NAME>"
        val paidToPatterns = listOf(
            Pattern.compile("(?i)(?:paid\\s+to|sent\\s+to|payment\\s+to)\\s+([A-Za-z][\\w\\s&'.@,-]{1,35}?)(?:[.\\s]+(?:ref|Ref|on|upi|txn|vpa|if|amt|bal|balance|info|\\d)|\$)"),
            Pattern.compile("(?i)(?:trf|txfr|transfer(?:red)?)\\s+to\\s+([A-Za-z][\\w\\s&'.@,-]{1,35}?)(?:[.\\s]+(?:ref|Ref|on|upi|txn|vpa|if|bal|balance|info|\\d)|\$)")
        )
        for (pattern in paidToPatterns) {
            val matcher = pattern.matcher(body)
            if (matcher.find()) {
                val cleaned = cleanMerchant(matcher.group(1) ?: "")
                if (cleaned != null) return cleaned
            }
        }

        // Strategy 3: "at <MERCHANT>"
        val atPattern = Pattern.compile("(?i)\\bat\\s+([A-Za-z][\\w\\s&'.,-]{2,35}?)(?:[.\\s]+(?:on|ref|Ref|upi|txn|vpa|card|a/c|acct|inr|rs|₹|if|bal|balance|info|\\d))")
        val atMatcher = atPattern.matcher(body)
        if (atMatcher.find()) {
            val cleaned = cleanMerchant(atMatcher.group(1) ?: "")
            if (cleaned != null) return cleaned
        }

        // Strategy 4: "received from <NAME>"
        val fromPattern = Pattern.compile("(?i)(?:received\\s+from|from)\\s+([A-Za-z][\\w\\s&'.@,-]{2,35}?)(?:[.\\s]+(?:on|ref|Ref|vpa|txn|if|bal|balance|info|\\d)|\$)")
        val fromMatcher = fromPattern.matcher(body)
        if (fromMatcher.find()) {
            val cleaned = cleanMerchant(fromMatcher.group(1) ?: "")
            if (cleaned != null) return cleaned
        }

        // Strategy 5: Known merchant name scan
        val knownMerchants = listOf(
            "Swiggy", "Zomato", "Dominos", "McDonald's", "KFC", "Pizza Hut", "Starbucks",
            "Amazon", "Flipkart", "Myntra", "Ajio", "Nykaa", "Meesho",
            "Uber", "Ola", "Rapido", "IRCTC", "MakeMyTrip", "Goibibo", "Redbus",
            "BigBasket", "Blinkit", "Zepto", "Dunzo", "Instamart",
            "Netflix", "Hotstar", "Spotify", "BookMyShow", "PVR", "Inox",
            "Apollo Pharmacy", "MedPlus", "Netmeds", "PharmEasy", "1mg"
        )
        val bodyLower = body.lowercase()
        for (merchant in knownMerchants) {
            if (bodyLower.contains(merchant.lowercase())) {
                return merchant
            }
        }

        return null
    }

    private fun cleanMerchant(raw: String): String? {
        val cleaned = raw.trim()
            .replace(Regex("\\s+"), " ")
            .replace(Regex("[,.\\s]+$"), "")
            .replace(Regex("^(?:the|a|an|merchant|m/s|pymt to|payment to)\\s+", RegexOption.IGNORE_CASE), "")
            .trim()

        if (cleaned.length < 2 || cleaned.length > 45) return null

        val skip = setOf("user", "customer", "dear", "upi", "the", "your", "you", "self", "bank", "account", "me")
        if (skip.contains(cleaned.lowercase())) return null
        if (Regex("^\\d+$").matches(cleaned)) return null

        return toTitleCase(cleaned)
    }

    private fun toTitleCase(str: String): String {
        return str.lowercase().split(" ").joinToString(" ") { word ->
            word.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        }
    }

    private fun extractBalance(body: String): Double? {
        val patterns = listOf(
            Pattern.compile("(?i)(?:avl?\\.?\\s*bal(?:ance)?|available\\s+balance|a/c\\s+bal(?:ance)?|bal(?:ance)?\\s+(?:is|:))\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)"),
            Pattern.compile("(?i)(?:bal|bal\\.)\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+\\.?\\d*)")
        )
        for (pattern in patterns) {
            val matcher = pattern.matcher(body)
            if (matcher.find()) {
                val balStr = matcher.group(1)?.replace(",", "") ?: continue
                return try {
                    balStr.toDouble()
                } catch (e: NumberFormatException) {
                    null
                }
            }
        }
        return null
    }

    private fun classifyCategory(body: String, merchant: String?, type: String): String {
        if (type == "income") {
            if (body.contains("salary", true) || body.contains("credits salary", true)) return "Salary"
            if (body.contains("freelance", true) || body.contains("internship", true) || body.contains("consultancy", true)) return "Freelance"
            if (body.contains("bonus", true) || body.contains("incentive", true)) return "Bonus"
            if (body.contains("refund", true) || body.contains("cashback", true) || body.contains("reversed", true)) return "Refund"
            if (body.contains("dividend", true) || body.contains("interest", true) || body.contains("maturity", true)) return "Investment"
            if (body.contains("rent", true)) return "Rent Income"
            return "Other"
        }

        val textToSearch = "${body.lowercase()} ${merchant?.lowercase() ?: ""}"

        if (containsAny(textToSearch, listOf("zomato", "swiggy", "starbucks", "restaurant", "food", "cafe", "bakery", "pizza", "domino", "kfc", "mcdonald", "dine", "eats", "hotel", "canteen", "biryani", "dhaba", "mess", "faasos", "burger king", "subway"))) return "Food"
        if (containsAny(textToSearch, listOf("uber", "ola", "rapido", "irctc", "makemytrip", "redbus", "flight", "metro", "cab", "taxi", "train", "yatra", "travel", "cleartrip", "goibibo", "indigo", "spicejet", "air india"))) return "Travel"
        if (containsAny(textToSearch, listOf("electricity", "gas", "water", "bescom", "airtel", "jio", "vi", "broadband", "wifi", "rent", "insurance", "lic", "premium", "dth", "tata sky", "dishtv", "postpaid", "bill", "municipal", "society", "maintenance", "tata power", "adani"))) return "Bills"
        if (containsAny(textToSearch, listOf("recharge", "topup", "talktime", "prepaid"))) return "Recharge"
        if (containsAny(textToSearch, listOf("emi", "loan", "bajaj", "finance", "muthoot", "chola", "hdfc loan"))) return "EMI"
        if (containsAny(textToSearch, listOf("petrol", "diesel", "cng", "shell", "fuel", "indian oil", "hpcl", "bpcl", "iocl", "fastag", "toll"))) return "Fuel"
        if (containsAny(textToSearch, listOf("amazon", "flipkart", "myntra", "meesho", "nykaa", "ajio", "grocery", "groceries", "supermarket", "dmart", "reliance", "croma", "mall", "shoppers", "retail", "store", "mart", "bigbasket", "blinkit", "zepto", "instamart"))) return "Shopping"
        if (containsAny(textToSearch, listOf("netflix", "prime", "hotstar", "spotify", "bookmyshow", "pvr", "cinema", "movie", "ticket", "youtube premium", "club", "game", "zee5", "sonyliv"))) return "Entertainment"
        if (containsAny(textToSearch, listOf("zerodha", "groww", "angel", "mutual fund", "sip", "stock", "coin", "wazirx", "investment", "fd", "rd", "ppf", "nps"))) return "Investment"
        if (containsAny(textToSearch, listOf("hospital", "pharmacy", "apollo", "medplus", "doctor", "clinic", "medicine", "lab", "health", "medical", "pharmeasy", "netmeds", "1mg"))) return "Health"
        if (containsAny(textToSearch, listOf("school", "college", "fee", "udemy", "coursera", "book", "stationery", "tuition", "education", "class", "university", "coaching"))) return "Education"

        return "Other"
    }

    private fun containsAny(text: String, keywords: List<String>): Boolean {
        for (keyword in keywords) {
            if (text.contains(keyword)) return true
        }
        return false
    }
}
