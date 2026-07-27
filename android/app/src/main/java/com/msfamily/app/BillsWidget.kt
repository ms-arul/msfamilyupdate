package com.msfamily.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.color.ColorProvider
import androidx.glance.background
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext

private val BillIdKey = ActionParameters.Key<String>("bill_id")
private val IsDbKey = ActionParameters.Key<Boolean>("is_db")

class BillsWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            BillsWidgetContent(context)
        }
    }
}

@Composable
fun BillsWidgetContent(context: Context) {
    val bills = runBlocking { WidgetRepository.getUpcomingBills(context) }
    val nextBill = bills.firstOrNull()

    val viewBillsIntent = Intent(context, MainActivity::class.java).apply {
        action = Intent.ACTION_VIEW
        data = Uri.parse("msfamily://loans")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ImageProvider(R.drawable.widget_glass_background))
            .padding(14.dp)
    ) {
        Column(modifier = GlanceModifier.fillMaxSize()) {
            // Header Row: Apple Style Title + MS Family Badge
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "UPCOMING BILLS",
                    style = TextStyle(
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                    )
                )
                Spacer(modifier = GlanceModifier.defaultWeight())
                Box(
                    modifier = GlanceModifier
                        .background(ImageProvider(R.drawable.widget_chip_background))
                        .padding(horizontal = 7.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "MS FAMILY",
                        style = TextStyle(
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = ColorProvider(day = Color(0xFF4F46E5), night = Color(0xFF818CF8))
                        )
                    )
                }
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            if (nextBill == null) {
                // Glass Empty state
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .defaultWeight()
                        .background(ImageProvider(R.drawable.widget_card_background))
                        .padding(10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "✓ ",
                            style = TextStyle(
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFF10B981), night = Color(0xFF34D399))
                            )
                        )
                        Text(
                            text = "All upcoming bills are settled",
                            style = TextStyle(
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                            )
                        )
                    }
                }
            } else {
                // Active bill details inside glass card
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .defaultWeight()
                        .background(ImageProvider(R.drawable.widget_card_background))
                        .padding(10.dp)
                ) {
                    Column(modifier = GlanceModifier.fillMaxSize()) {
                        Row(
                            modifier = GlanceModifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Priority indicator dot
                            val dotColor = when (nextBill.priority) {
                                "High" -> Color(0xFFF43F5E) // Rose Red
                                "Medium" -> Color(0xFFF59E0B) // Amber Orange
                                else -> Color(0xFF10B981) // Emerald Green
                            }

                            Box(
                                modifier = GlanceModifier
                                    .size(7.dp)
                                    .background(dotColor)
                            ) {}
                            Spacer(modifier = GlanceModifier.width(6.dp))
                            Text(
                                text = nextBill.title,
                                style = TextStyle(
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = ColorProvider(day = Color(0xFF0F172A), night = Color(0xFFF8FAFC))
                                ),
                                maxLines = 1
                            )
                        }

                        Spacer(modifier = GlanceModifier.height(6.dp))

                        Row(
                            modifier = GlanceModifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Bottom
                        ) {
                            Column {
                                Text(
                                    text = "Due ${nextBill.dueDate}",
                                    style = TextStyle(
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                                    )
                                )
                                Text(
                                    text = "₹${nextBill.amount.toInt()}",
                                    style = TextStyle(
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = ColorProvider(day = Color(0xFF0F172A), night = Color(0xFFF8FAFC))
                                    )
                                )
                            }

                            Spacer(modifier = GlanceModifier.defaultWeight())

                            // Countdown badge
                            val badgeBg = when (nextBill.remainingDays) {
                                0 -> Color(0xFFFFECEF)
                                1 -> Color(0xFFFFF7ED)
                                else -> Color(0xFFF0FDF4)
                            }
                            val badgeText = when (nextBill.remainingDays) {
                                0 -> "Due Today"
                                1 -> "Tomorrow"
                                else -> "${nextBill.remainingDays}d left"
                            }
                            val badgeTextColor = when (nextBill.remainingDays) {
                                0 -> Color(0xFFE11D48)
                                1 -> Color(0xFFD97706)
                                else -> Color(0xFF059669)
                            }

                            Box(
                                modifier = GlanceModifier
                                    .background(badgeBg)
                                    .padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = badgeText,
                                    style = TextStyle(
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = ColorProvider(day = badgeTextColor, night = badgeTextColor)
                                    )
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Glossy Action Row
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // View Bills Button
                Box(
                    modifier = GlanceModifier
                        .background(ImageProvider(R.drawable.widget_chip_background))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                        .clickable(actionStartActivity(viewBillsIntent))
                ) {
                    Text(
                        text = "View Bills",
                        style = TextStyle(
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = ColorProvider(day = Color(0xFF4F46E5), night = Color(0xFF818CF8))
                        )
                    )
                }

                if (nextBill != null) {
                    Spacer(modifier = GlanceModifier.defaultWeight())
                    // Mark Paid Primary Button
                    Box(
                        modifier = GlanceModifier
                            .background(ImageProvider(R.drawable.widget_button_primary))
                            .padding(horizontal = 12.dp, vertical = 5.dp)
                            .clickable(
                                actionRunCallback<SettleBillAction>(
                                    actionParametersOf(
                                        BillIdKey to nextBill.id,
                                        IsDbKey to nextBill.isDb
                                    )
                                )
                            )
                    ) {
                        Text(
                            text = "✓ Mark Paid",
                            style = TextStyle(
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFFFFFFFF))
                            )
                        )
                    }
                }
            }
        }
    }
}

class SettleBillAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val billId = parameters[BillIdKey] ?: return
        val isDb = parameters[IsDbKey] ?: false
        
        withContext(Dispatchers.IO) {
            try {
                if (isDb) {
                    val creds = WidgetRepository.getCredentials(context)
                    val urlStr = creds["url"]
                    val anonKey = creds["anonKey"]
                    val token = creds["token"]
                    val bearerToken = token ?: anonKey
                    
                    if (!urlStr.isNullOrEmpty() && !anonKey.isNullOrEmpty()) {
                        val updateUrl = "$urlStr/rest/v1/loans?id=eq.$billId"
                        // PATCH request to Supabase to settle
                        sendPatchRequest(updateUrl, anonKey, bearerToken, "{\"status\":\"settled\"}")
                    }
                } else {
                    // Settle mock bill locally (remove from list by adding to paid cache)
                    val wPrefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
                    wPrefs.edit().putBoolean("mock_paid_$billId", true).apply()
                }
            } catch (e: java.lang.Exception) {
                Log.e("SettleBillAction", "Failed to settle bill $billId", e)
            }
        }
        
        // Refresh local cache and update widgets!
        WidgetRepository.getUpcomingBills(context)
        WidgetUpdateManager.updateAllWidgets(context)
    }

    private fun sendPatchRequest(urlStr: String, anonKey: String?, token: String?, jsonBody: String) {
        var connection: java.net.HttpURLConnection? = null
        try {
            val url = java.net.URL(urlStr)
            connection = url.openConnection() as java.net.HttpURLConnection
            connection.requestMethod = "PATCH"
            connection.setRequestProperty("apikey", anonKey)
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.outputStream.write(jsonBody.toByteArray(java.nio.charset.StandardCharsets.UTF_8))
            connection.responseCode // Trigger execution
        } catch (e: java.lang.Exception) {
            Log.e("SettleBillAction", "PATCH failed: ${e.message}")
        } finally {
            connection?.disconnect()
        }
    }
}

class BillsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = BillsWidget()
}
