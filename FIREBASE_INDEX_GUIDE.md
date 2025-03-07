# Firebase Index Setup Guide

## Creating the Required Index for Games Collection

You're seeing the error because Firestore requires a composite index for queries that filter on multiple fields and include ordering. Follow these steps to create the necessary index:

1. **Click on the link in the error message**:
   ```
   https://console.firebase.google.com/v1/r/project/pickup-ba57f/firestore/indexes?create_composite=Ckpwcm9qZWN0cy9waWNrdXAtYmE1N2YvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2dhbWVzL2luZGV4ZXMvXxABGhAKDHBhcnRpY2lwYW50cxgBGggKBGRhdGUQARoMCghfX25hbWVfXxAB
   ```

2. **Sign in to your Firebase console** if prompted.

3. **Review the index configuration**:
   - Collection: `games`
   - Fields to index:
     - `participants` (Array contains)
     - `date` (Ascending)
     - `__name__` (Ascending)

4. **Click "Create index"** to create the index.

5. **Wait for the index to build**:
   - Index creation can take a few minutes to complete.
   - You'll see a status indicator showing the progress.

6. **Once the index is built**, your queries will work correctly.

## Alternative: Manual Index Creation

If the link doesn't work, you can manually create the index:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Navigate to "Firestore Database" in the left sidebar.
4. Click on the "Indexes" tab.
5. Click "Add Index".
6. For "Collection", enter `games`.
7. Add the following fields:
   - Field path: `participants`, Index type: `Array contains`
   - Field path: `date`, Index type: `Ascending`
   - Field path: `__name__`, Index type: `Ascending` (this is added automatically)
8. Click "Create".

## Understanding Firestore Indexes

Firestore requires composite indexes for:
- Queries with range filters on different fields
- Queries with a range filter and an order by on different fields
- Queries with an equality filter and an order by on different fields
- Queries with a composite order by

Your query is using:
- An array-contains filter on `participants`
- A range filter on `date` (>=)
- Ordering by `date`

This combination requires a composite index.

## Temporary Workaround

While waiting for the index to build, the app will:
1. Try the complex query first
2. If it fails due to missing index, fall back to a simpler query
3. Filter and sort the results in JavaScript
4. If all else fails, use mock data

This ensures your app remains functional even before the index is created. 