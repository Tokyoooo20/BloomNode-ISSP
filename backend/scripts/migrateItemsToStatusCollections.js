const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Request = require('../models/Request');
const ApprovedItem = require('../models/ApprovedItem');
const PendingItem = require('../models/PendingItem');
const DisapprovedItem = require('../models/DisapprovedItem');
const { syncAllItemsFromRequest } = require('../utils/itemSync');

const migrateItemsToStatusCollections = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('ERROR: MONGODB_URI environment variable is not set!');
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');
    console.log('Starting migration of items to status collections...\n');

    // Get all requests
    const allRequests = await Request.find().populate('userId', 'unit campus');
    console.log(`Found ${allRequests.length} requests to process\n`);

    let processedCount = 0;
    let errorCount = 0;

    // Process each request
    for (const request of allRequests) {
      try {
        // Sync all items from this request to status collections
        await syncAllItemsFromRequest(request);
        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`Processed ${processedCount}/${allRequests.length} requests...`);
        }
      } catch (error) {
        console.error(`Error processing request ${request._id}:`, error.message);
        errorCount++;
      }
    }

    // Get counts after migration
    const [pendingCount, approvedCount, disapprovedCount] = await Promise.all([
      PendingItem.countDocuments(),
      ApprovedItem.countDocuments(),
      DisapprovedItem.countDocuments()
    ]);

    console.log('\n=== Migration Complete ===');
    console.log(`Processed: ${processedCount} requests`);
    console.log(`Errors: ${errorCount}`);
    console.log(`\nStatus Collections:`);
    console.log(`  Pending Items: ${pendingCount}`);
    console.log(`  Approved Items: ${approvedCount}`);
    console.log(`  Disapproved Items: ${disapprovedCount}`);
    console.log(`  Total Items: ${pendingCount + approvedCount + disapprovedCount}`);

    await mongoose.connection.close();
    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run migration
migrateItemsToStatusCollections();

