/**
 * Migrates Program unique index so uniqueness is { name + campus } only (per campus),
 * not tied to faculty. Drops legacy indexes: name_1_faculty_1, name_1_faculty_1_campus_1,
 * and any plain name_1_campus_1 without the partial filter.
 *
 * Run from repo root: node backend/scripts/fixProgramIndex.js
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Program = require('../models/Program');

async function fixProgramIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bloomnode', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collectionName = Program.collection.name;

    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.log(`ℹ️  Collection "${collectionName}" does not exist yet.`);
      console.log('   Indexes will be created when the first program is saved.');
      await mongoose.disconnect();
      process.exit(0);
    }

    const coll = Program.collection;

    let indexes = await coll.indexes();
    console.log('\nCurrent indexes:');
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    const namesToTryDrop = [
      'name_1_faculty_1',
      'name_1_faculty_1_campus_1',
      'name_1_campus_1'
    ];

    for (const indexName of namesToTryDrop) {
      try {
        await coll.dropIndex(indexName);
        console.log(`\n✅ Dropped index ${indexName}`);
      } catch (err) {
        if (err.code === 27 || err.codeName === 'IndexNotFound') {
          // skip
        } else {
          throw err;
        }
      }
    }

    // Drop any other unique index on name + faculty (by key shape)
    indexes = await coll.indexes();
    for (const idx of indexes) {
      if (idx.name === '_id_') continue;
      const k = idx.key || {};
      const keys = Object.keys(k);
      if (keys.includes('name') && keys.includes('faculty') && idx.unique) {
        try {
          await coll.dropIndex(idx.name);
          console.log(`\n✅ Dropped legacy index ${idx.name}`);
        } catch (err) {
          if (err.code !== 27 && err.codeName !== 'IndexNotFound') throw err;
        }
      }
    }

    try {
      await coll.createIndex(
        { name: 1, campus: 1 },
        {
          unique: true,
          partialFilterExpression: { campus: { $exists: true, $ne: null } }
        }
      );
      console.log(
        '\n✅ Created unique partial index { name: 1, campus: 1 } (only documents with campus set)'
      );
    } catch (err) {
      if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
        console.log('\nℹ️  Target index already exists');
      } else if (err.code === 11000) {
        console.error(
          '\n❌ Cannot create index: two programs share the same name on the same campus.'
        );
        console.error('   Fix duplicates in Atlas or rename one program, then run again.');
        throw err;
      } else {
        throw err;
      }
    }

    const finalIndexes = await coll.indexes();
    console.log('\nFinal indexes:');
    finalIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ Program index migration completed.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixProgramIndex();
