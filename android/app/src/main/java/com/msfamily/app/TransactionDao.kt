package com.msfamily.app

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions ORDER BY date DESC, createdAt DESC")
    suspend fun getAllTransactions(): List<TransactionEntity>

    @Query("SELECT * FROM transactions ORDER BY date DESC, createdAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getTransactionsPaged(limit: Int, offset: Int = 0): List<TransactionEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(transactions: List<TransactionEntity>)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIgnore(transaction: TransactionEntity): Long

    @Query("DELETE FROM transactions")
    suspend fun clearCache()

    @Query("SELECT EXISTS(SELECT 1 FROM transactions WHERE smsReference = :smsRef LIMIT 1)")
    suspend fun checkSmsExists(smsRef: String): Boolean

    /** Check duplicate by amount + date + bank (composite dedup) */
    @Query("SELECT EXISTS(SELECT 1 FROM transactions WHERE amount = :amount AND date = :date AND bankName = :bankName LIMIT 1)")
    suspend fun checkDuplicate(amount: Double, date: String, bankName: String?): Boolean

    /** Mark a transaction as synced to Supabase */
    @Query("UPDATE transactions SET synced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)

    /** Get all unsynced transactions for retry on next app open */
    @Query("SELECT * FROM transactions WHERE synced = 0 AND memberId != '' ORDER BY createdAt ASC")
    suspend fun getUnsyncedTransactions(): List<TransactionEntity>

    /** Prune old entries to keep cache bounded */
    @Query("DELETE FROM transactions WHERE id NOT IN (SELECT id FROM transactions ORDER BY date DESC, createdAt DESC LIMIT :keepCount)")
    suspend fun pruneOldEntries(keepCount: Int = 1000)

    /** Get count of cached transactions */
    @Query("SELECT COUNT(*) FROM transactions")
    suspend fun getCount(): Int
}
