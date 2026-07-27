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

class FinancialWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            FinancialWidgetContent(context)
        }
    }
}

@Composable
fun FinancialWidgetContent(context: Context) {
    val data = runBlocking { WidgetRepository.getFinancialData(context) }

    val progressColor = when {
        data.budgetProgress < 70 -> Color(0xFF10B981) // Emerald Green
        data.budgetProgress < 100 -> Color(0xFFF59E0B) // Amber Orange
        else -> Color(0xFFF43F5E) // Rose Red
    }

    val openAppIntent = Intent(context, MainActivity::class.java).apply {
        action = Intent.ACTION_VIEW
        this.data = Uri.parse("msfamily://dashboard")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }

    val addExpenseIntent = Intent(context, MainActivity::class.java).apply {
        action = Intent.ACTION_VIEW
        this.data = Uri.parse("msfamily://add?type=expense")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ImageProvider(R.drawable.widget_glass_background))
            .padding(14.dp)
    ) {
        Column(modifier = GlanceModifier.fillMaxSize()) {
            // Header Row
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "FINANCIAL OVERVIEW",
                    style = TextStyle(
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                    )
                )
                Spacer(modifier = GlanceModifier.defaultWeight())
                Box(
                    modifier = GlanceModifier
                        .size(8.dp)
                        .background(progressColor)
                ) {}
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Main stats inner glass card
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
                    // Left Column: Today's Spent & Savings
                    Column(modifier = GlanceModifier.defaultWeight()) {
                        Text(
                            text = "TODAY'S SPENT",
                            style = TextStyle(
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                            )
                        )
                        Text(
                            text = "₹${data.todayExpenses.toInt()}",
                            style = TextStyle(
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFFF43F5E), night = Color(0xFFFB7185))
                            )
                        )
                        Spacer(modifier = GlanceModifier.height(4.dp))
                        Text(
                            text = "SAVINGS",
                            style = TextStyle(
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                            )
                        )
                        Text(
                            text = "₹${data.monthlySavings.toInt()}",
                            style = TextStyle(
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFF10B981), night = Color(0xFF34D399))
                            )
                        )
                    }

                    // Right Column: Remaining Budget & Progress Track
                    Column(modifier = GlanceModifier.defaultWeight()) {
                        Text(
                            text = "REMAINING BUDGET",
                            style = TextStyle(
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                            )
                        )
                        Text(
                            text = "₹${data.remainingBudget.toInt()}",
                            style = TextStyle(
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFF0F172A), night = Color(0xFFF8FAFC))
                            )
                        )
                        Text(
                            text = "Limit: ₹${data.budgetLimit.toInt()}",
                            style = TextStyle(
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Medium,
                                color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                            )
                        )
                        
                        Spacer(modifier = GlanceModifier.height(5.dp))
                        
                        // Progress Bar Track
                        Row(
                            modifier = GlanceModifier
                                .fillMaxWidth()
                                .height(5.dp)
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
                        Spacer(modifier = GlanceModifier.height(2.dp))
                        Text(
                            text = "${data.budgetProgress}% Used",
                            style = TextStyle(
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                            )
                        )
                    }
                }
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Action buttons row
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Dashboard button
                Box(
                    modifier = GlanceModifier
                        .background(ImageProvider(R.drawable.widget_chip_background))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                        .clickable(actionStartActivity(openAppIntent))
                ) {
                    Text(
                        text = "Dashboard",
                        style = TextStyle(
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = ColorProvider(day = Color(0xFF4F46E5), night = Color(0xFF818CF8))
                        )
                    )
                }
                
                Spacer(modifier = GlanceModifier.defaultWeight())
                
                // Add Expense button
                Box(
                    modifier = GlanceModifier
                        .background(ImageProvider(R.drawable.widget_button_primary))
                        .padding(horizontal = 12.dp, vertical = 5.dp)
                        .clickable(actionStartActivity(addExpenseIntent))
                ) {
                    Text(
                        text = "+ Add Expense",
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

class FinancialWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = FinancialWidget()
}
