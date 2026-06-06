package com.msfamily.app

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.util.Log
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull

object LocationRepository {
    private const val TAG = "LocationRepository"

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(context: Context): Location? {
        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
        val cts = CancellationTokenSource()
        
        return try {
            // Fetch current GPS location with high accuracy and a 10s timeout
            withTimeoutOrNull(10000) {
                fusedLocationClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    cts.token
                ).await()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting precise location: ${e.message}")
            // Fallback to last known location if high accuracy retrieval fails
            try {
                fusedLocationClient.lastLocation.await()
            } catch (lastEx: Exception) {
                Log.e(TAG, "Error getting last known location fallback: ${lastEx.message}")
                null
            }
        } finally {
            cts.cancel()
        }
    }
}
