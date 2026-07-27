package com.msfamily.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.color.ColorProvider
import androidx.glance.background
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.runBlocking

class BudgetWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            BudgetWidgetContent(context)
        }
    }
}

@Composable
fun BudgetWidgetContent(context: Context) {
    val data = runBlocking { WidgetRepository.getFinancialData(context) }

    val openAppIntent = Intent(context, MainActivity::class.java).apply {
        action = Intent.ACTION_VIEW
        this.data = Uri.parse("msfamily://analytics")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }

    val statusText = when {
        data.budgetProgress < 70 -> "On Track"
        data.budgetProgress < 100 -> "Near Limit"
        else -> "Over Budget"
    }

    val progressColor = when {
        data.budgetProgress < 70 -> Color(0xFF10B981) // Emerald Green
        data.budgetProgress < 100 -> Color(0xFFF59E0B) // Amber Orange
        else -> Color(0xFFF43F5E) // Rose Red
    }

    val badgeBg = when {
        data.budgetProgress < 70 -> Color(0xFFECFDF5)
        data.budgetProgress < 100 -> Color(0xFFFFF7ED)
        else -> Color(0xFFFFF1F2)
    }

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ImageProvider(R.drawable.widget_glass_background))
            .padding(14.dp)
            .clickable(actionStartActivity(openAppIntent))
    ) {
        Column(modifier = GlanceModifier.fillMaxSize()) {
            // Header Row
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "BUDGET HEALTH",
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
                        text = "THIS MONTH",
                        style = TextStyle(
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = ColorProvider(day = Color(0xFF4F46E5), night = Color(0xFF818CF8))
                        )
                    )
                }
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Main Content Inner Glass Card
            Box(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .defaultWeight()
                    .background(ImageProvider(R.drawable.widget_card_background))
                    .padding(10.dp)
            ) {
                Row(
                    modifier = GlanceModifier.fillMaxSize(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Left Column: Spent vs Limit & Status Badge
                    Column(modifier = GlanceModifier.defaultWeight()) {
                        Text(
                            text = "₹${data.monthlyExpenses.toInt()}",
                            style = TextStyle(
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFF0F172A), night = Color(0xFFF8FAFC))
                            )
                        )
                        Text(
                            text = "Limit: ₹${data.budgetLimit.toInt()}",
                            style = TextStyle(
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                            )
                        )
                        Spacer(modifier = GlanceModifier.height(6.dp))

                        // Status Badge
                        Box(
                            modifier = GlanceModifier
                                .background(badgeBg)
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = statusText,
                                style = TextStyle(
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = ColorProvider(day = progressColor, night = progressColor)
                                )
                            )
                        }
                    }

                    // Right Column: Big percentage indicator
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "${data.budgetProgress}%",
                            style = TextStyle(
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = progressColor, night = progressColor)
                            )
                        )
                        Text(
                            text = "USED",
                            style = TextStyle(
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                            )
                        )
                    }
                }
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Progress Bar Track
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .background(ImageProvider(R.drawable.widget_progress_track))
            ) {
                val progressVal = Math.min(data.budgetProgress, 100)
                if (progressVal > 3) {
                    Box(
                        modifier = GlanceModifier
                            .fillMaxHeight()
                            .defaultWeight()
                            .background(progressColor)
                    ) {}
                }
                if (progressVal < 100) {
                    Spacer(modifier = GlanceModifier.defaultWeight())
                }
            }
        }
    }
}

class BudgetWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = BudgetWidget()
}
