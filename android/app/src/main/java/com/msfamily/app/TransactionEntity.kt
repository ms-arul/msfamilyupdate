package com.msfamily.app

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "transactions",
    indices = [
        Index(value = ["smsReference"], unique = true),
        Index(value = ["amount", "date", "bankName"]),
        Index(value = ["synced"]),
        Index(value = ["date"]),
        Index(value = ["memberId"])
    ]
)
data class TransactionEntity(
    @PrimaryKey
    val id: String,
    val amount: Double,
    val category: String,
    val type: String, // "income" or "expense"
    val date: String, // "YYYY-MM-DD"
    val notes: String,
    val memberId: String,
    val memberName: String,
    val proofUrl: String?,
    val source: String, // "manual" or "sms"
    val bankName: String?,
    val merchantName: String?,
    val smsConfidence: Double?,
    val smsReference: String?,
    val createdAt: String,
    @ColumnInfo(defaultValue = "0")
    val synced: Boolean = false
)
