import { MongoClient } from 'mongodb';

class MongoStore {
  constructor() {
    this.client = null;
    this.db = null;
    this.ready = false;
  }

  async connect() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is required. MyRyedo will not start without MongoDB.');
    }
    this.client = new MongoClient(uri, { maxPoolSize: 20, serverSelectionTimeoutMS: 10000 });
    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB_NAME || 'myryedo');
    this.ready = true;
    await this.db.command({ ping: 1 });
    console.log(`[MongoDB] Connected to database: ${this.db.databaseName}`);
  }

  collection(name) {
    if (!this.db) throw new Error('MongoDB is not connected.');
    return this.db.collection(name);
  }

  async readCollection(name) {
    return this.collection(name).find({}).sort({ _createdAt: 1 }).toArray();
  }

  async replaceCollection(name, items) {
    const collection = this.collection(name);
    await collection.deleteMany({});
    if (Array.isArray(items) && items.length) {
      await collection.insertMany(items.map((item) => ({ ...item })));
    }
  }

  async readSingleton(name, fallback) {
    const doc = await this.collection(name).findOne({ _id: 'singleton' });
    return doc ? { ...doc, _id: undefined } : fallback;
  }

  async writeSingleton(name, value) {
    await this.collection(name).replaceOne(
      { _id: 'singleton' },
      { _id: 'singleton', ...value },
      { upsert: true }
    );
  }

  async close() {
    if (this.client) await this.client.close();
  }
}

export const mongoStore = new MongoStore();
