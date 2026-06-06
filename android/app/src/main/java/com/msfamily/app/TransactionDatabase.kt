package com.msfamily.app

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(entities = [TransactionEntity::class], version = 2, exportSchema = false)
abstract class TransactionDatabase : RoomDatabase() {
    abstract fun transactionDao(): TransactionDao

    companion object {
        @Volatile
        private var INSTANCE: TransactionDatabase? = null

        /**
         * Migration from v1 → v2: Add 'synced' column and new indexes.
         */
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Add synced column with default value 0 (false)
                db.execSQL("ALTER TABLE transactions ADD COLUMN synced INTEGER NOT NULL DEFAULT 0")
                // Add indexes for performance
                db.execSQL("CREATE INDEX IF NOT EXISTS index_transactions_synced ON transactions (synced)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_transactions_date ON transactions (date)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_transactions_memberId ON transactions (memberId)")
            }
        }

        fun getDatabase(context: Context): TransactionDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    TransactionDatabase::class.java,
                    "ms_family_database"
                )
                .addMigrations(MIGRATION_1_2)
                .fallbackToDestructiveMigration(true)
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
