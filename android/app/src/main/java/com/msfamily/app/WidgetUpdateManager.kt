package com.msfamily.app

import android.content.Context
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.updateAll
import androidx.work.*
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class WidgetUpdateWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        Log.d("WidgetUpdateWorker", "WorkManager widget update triggered")
        // Refresh local cache data from Supabase in background
        WidgetRepository.getUpcomingBills(applicationContext)
        // Trigger widget updates
        WidgetUpdateManager.updateAllWidgets(applicationContext)
        return Result.success()
    }
}

object WidgetUpdateManager {
    private const val TAG = "WidgetUpdateManager"

    fun updateAllWidgets(context: Context) {
        val coroutineScope = CoroutineScope(Dispatchers.Main)
        coroutineScope.launch {
            try {
                Log.d(TAG, "Updating all Glance widgets...")
                
                // 1. FinancialWidget
                FinancialWidget().updateAll(context)

                // 2. BillsWidget
                BillsWidget().updateAll(context)

                // 3. QuickActionsWidget
                QuickActionsWidget().updateAll(context)

                // 4. BudgetWidget
                BudgetWidget().updateAll(context)

                // 5. InsightsWidget
                InsightsWidget().updateAll(context)

                Log.d(TAG, "All Glance widgets updated successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Error updating widgets", e)
            }
        }
    }

    // Schedule background WorkManager task to refresh every 30 minutes
    fun schedulePeriodicUpdates(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val request = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(30, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "MSFamilyWidgetUpdate",
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
        Log.d(TAG, "Periodic widget updates scheduled via WorkManager")
    }
}
