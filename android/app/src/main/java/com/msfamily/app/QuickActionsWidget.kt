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

class QuickActionsWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            QuickActionsWidgetContent(context)
        }
    }
}

@Composable
fun QuickActionsWidgetContent(context: Context) {
    val createIntent = { deepLink: String ->
        Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse(deepLink)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
    }

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ImageProvider(R.drawable.widget_glass_background))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Quick Action 1: Add Expense
            QuickActionItem(context, "+ Exp", "msfamily://add?type=expense", createIntent, isPrimary = true)
            Spacer(modifier = GlanceModifier.defaultWeight())

            // Quick Action 2: Add Income
            QuickActionItem(context, "+ Inc", "msfamily://add?type=income", createIntent, isPrimary = false)
            Spacer(modifier = GlanceModifier.defaultWeight())

            // Quick Action 3: Scan Receipt
            QuickActionItem(context, "Scan", "msfamily://add?scan=true", createIntent, isPrimary = false)
            Spacer(modifier = GlanceModifier.defaultWeight())

            // Quick Action 4: Upload Doc
            QuickActionItem(context, "Doc", "msfamily://proofs?upload=true", createIntent, isPrimary = false)
            Spacer(modifier = GlanceModifier.defaultWeight())

            // Quick Action 5: Invite
            QuickActionItem(context, "Invite", "msfamily://family/invite", createIntent, isPrimary = false)
        }
    }
}

@Composable
private fun QuickActionItem(
    context: Context,
    label: String,
    deepLink: String,
    intentCreator: (String) -> Intent,
    isPrimary: Boolean = false
) {
    val bgDrawable = if (isPrimary) R.drawable.widget_button_primary else R.drawable.widget_chip_background
    val textColor = if (isPrimary) {
        ColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFFFFFFFF))
    } else {
        ColorProvider(day = Color(0xFF4F46E5), night = Color(0xFF818CF8))
    }

    Box(
        modifier = GlanceModifier
            .background(ImageProvider(bgDrawable))
            .padding(horizontal = 9.dp, vertical = 7.dp)
            .clickable(actionStartActivity(intentCreator(deepLink))),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            style = TextStyle(
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
        )
    }
}

class QuickActionsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = QuickActionsWidget()
}
