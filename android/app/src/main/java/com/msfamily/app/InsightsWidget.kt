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

class InsightsWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            InsightsWidgetContent(context)
        }
    }
}

@Composable
fun InsightsWidgetContent(context: Context) {
    val insights = runBlocking { WidgetRepository.getSmartInsights(context) }
    
    // Select an insight dynamically based on the current minute seed
    val timeSeed = java.util.Calendar.getInstance().get(java.util.Calendar.MINUTE)
    val chosenInsight = if (insights.isNotEmpty()) insights[timeSeed % insights.size] else null

    val openAnalyticsIntent = Intent(context, MainActivity::class.java).apply {
        action = Intent.ACTION_VIEW
        data = Uri.parse("msfamily://analytics")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }

    val typeColor = when (chosenInsight?.type) {
        "positive" -> Color(0xFF10B981) // Emerald Green
        "warning" -> Color(0xFFF43F5E) // Rose Red
        else -> Color(0xFF6366F1) // Indigo/Info
    }

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ImageProvider(R.drawable.widget_glass_background))
            .padding(14.dp)
            .clickable(actionStartActivity(openAnalyticsIntent))
    ) {
        Column(modifier = GlanceModifier.fillMaxSize()) {
            // Header Row
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "✨ AI SMART INSIGHTS",
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
                        .background(typeColor)
                ) {}
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            if (chosenInsight == null) {
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .defaultWeight()
                        .background(ImageProvider(R.drawable.widget_card_background))
                        .padding(10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Analyzing your spending trends...",
                        style = TextStyle(
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = ColorProvider(day = Color(0xFF64748B), night = Color(0xFF94A3B8))
                        )
                    )
                }
            } else {
                // Insight Content Card
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .defaultWeight()
                        .background(ImageProvider(R.drawable.widget_card_background))
                        .padding(10.dp)
                ) {
                    Column(modifier = GlanceModifier.fillMaxSize()) {
                        Text(
                            text = chosenInsight.title,
                            style = TextStyle(
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = ColorProvider(day = Color(0xFF0F172A), night = Color(0xFFF8FAFC))
                            ),
                            maxLines = 1
                        )
                        Spacer(modifier = GlanceModifier.height(4.dp))
                        Text(
                            text = chosenInsight.text,
                            style = TextStyle(
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = ColorProvider(day = Color(0xFF475569), night = Color(0xFF94A3B8))
                            ),
                            maxLines = 2
                        )
                    }
                }
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Action Pill
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Spacer(modifier = GlanceModifier.defaultWeight())
                Box(
                    modifier = GlanceModifier
                        .background(ImageProvider(R.drawable.widget_chip_background))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                        .clickable(actionStartActivity(openAnalyticsIntent))
                ) {
                    Text(
                        text = "Analytics →",
                        style = TextStyle(
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = ColorProvider(day = Color(0xFF4F46E5), night = Color(0xFF818CF8))
                        )
                    )
                }
            }
        }
    }
}

class InsightsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = InsightsWidget()
}
