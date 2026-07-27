package com.msfamily.app

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

@CapacitorPlugin(name = "TransactionCache")
class TransactionCachePlugin : Plugin() {

    private val ioScope = CoroutineScope(Dispatchers.IO)

    @PluginMethod
    fun getCachedTransactions(call: PluginCall) {
        ioScope.launch {
            try {
                val db = TransactionDatabase.getDatabase(context)
                val entities = db.transactionDao().getAllTransactions()
                val jsArray = JSArray()
                for (entity in entities) {
                    val obj = JSObject().apply {
                        put("id", entity.id)
                        put("amount", entity.amount)
                        put("category", entity.category)
                        put("type", entity.type)
                        put("date", entity.date)
                        put("notes", entity.notes)
                        put("memberId", entity.memberId)
                        put("memberName", entity.memberName)
                        put("proofUrl", entity.proofUrl)
                        put("source", entity.source)
                        put("bankName", entity.bankName)
                        put("merchantName", entity.merchantName)
                        put("smsConfidence", entity.smsConfidence)
                        put("smsReference", entity.smsReference)
                        put("created_at", entity.createdAt)
                    }
                    jsArray.put(obj)
                }
                val result = JSObject().apply {
                    put("transactions", jsArray)
                }
                call.resolve(result)
            } catch (e: Exception) {
                call.reject("Failed to retrieve cached transactions: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun cacheTransactions(call: PluginCall) {
        val txs = call.getArray("transactions")
        if (txs == null) {
            call.reject("transactions array is required")
            return
        }

        ioScope.launch {
            try {
                val db = TransactionDatabase.getDatabase(context)
                val entities = mutableListOf<TransactionEntity>()
                for (i in 0 until txs.length()) {
                    val obj = txs.getJSONObject(i)
                    val id = obj.optString("id", UUID.randomUUID().toString())
                    val entity = TransactionEntity(
                        id = id,
                        amount = obj.optDouble("amount", 0.0),
                        category = obj.optString("category", "Other"),
                        type = obj.optString("type", "expense"),
                        date = obj.optString("date", ""),
                        notes = obj.optString("notes", ""),
                        memberId = obj.optString("memberId", ""),
                        memberName = obj.optString("memberName", "Unknown"),
                        proofUrl = if (obj.isNull("proofUrl")) null else obj.optString("proofUrl", null),
                        source = obj.optString("source", "manual"),
                        bankName = if (obj.isNull("bankName")) null else obj.optString("bankName", null),
                        merchantName = if (obj.isNull("merchantName")) null else obj.optString("merchantName", null),
                        smsConfidence = if (obj.isNull("smsConfidence")) null else obj.optDouble("smsConfidence", 0.0),
                        smsReference = if (obj.isNull("smsReference")) null else obj.optString("smsReference", null),
                        createdAt = obj.optString("created_at", "")
                    )
                    entities.add(entity)
                }
                db.transactionDao().insertAll(entities)
                db.transactionDao().pruneOldEntries(1000)
                
                // Refresh native Glance widgets
                WidgetUpdateManager.updateAllWidgets(context)
                
                call.resolve()
            } catch (e: Exception) {
                call.reject("Failed to cache transactions: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun cachePreferences(call: PluginCall) {
        val budgetLimit = call.getDouble("budget_limit", 3000.0)
        val savingsTarget = call.getDouble("savings_target", 10000.0)
        
        ioScope.launch {
            try {
                val prefs = context.getSharedPreferences("WidgetPrefs", android.content.Context.MODE_PRIVATE)
                prefs.edit().apply {
                    putFloat("budget_limit", budgetLimit?.toFloat() ?: 3000.0f)
                    putFloat("savings_target", savingsTarget?.toFloat() ?: 10000.0f)
                    apply()
                }
                
                // Refresh native Glance widgets
                WidgetUpdateManager.updateAllWidgets(context)
                
                call.resolve()
            } catch (e: Exception) {
                call.reject("Failed to cache preferences: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun clearCache(call: PluginCall) {
        ioScope.launch {
            try {
                val db = TransactionDatabase.getDatabase(context)
                db.transactionDao().clearCache()
                
                // Refresh native Glance widgets
                WidgetUpdateManager.updateAllWidgets(context)
                
                call.resolve()
            } catch (e: Exception) {
                call.reject("Failed to clear cache: ${e.message}")
            }
        }
    }
}
