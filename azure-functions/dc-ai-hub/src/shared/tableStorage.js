/**
 * Denneen AI Learning Hub — Azure Table Storage Helper
 *
 * Provides CRUD operations for telemetry events and module completions.
 * Uses the @azure/data-tables SDK.
 */

const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables');

const CONNECTION_STRING = process.env.STORAGE_CONNECTION_STRING || '';
const TELEMETRY_TABLE = process.env.TELEMETRY_TABLE_NAME || 'telemetry';
const COMPLETIONS_TABLE = process.env.COMPLETIONS_TABLE_NAME || 'completions';

let telemetryClient = null;
let completionsClient = null;

function getTelemetryClient() {
    if (!telemetryClient && CONNECTION_STRING) {
        telemetryClient = TableClient.fromConnectionString(CONNECTION_STRING, TELEMETRY_TABLE);
    }
    return telemetryClient;
}

function getCompletionsClient() {
    if (!completionsClient && CONNECTION_STRING) {
        completionsClient = TableClient.fromConnectionString(CONNECTION_STRING, COMPLETIONS_TABLE);
    }
    return completionsClient;
}

/**
 * Write a telemetry event.
 * PartitionKey = date (YYYY-MM-DD), RowKey = unique ID.
 */
async function writeTelemetryEvent(userEmail, eventType, eventData) {
    const client = getTelemetryClient();
    if (!client) throw new Error('Table Storage not configured');

    const now = new Date();
    const entity = {
        partitionKey: now.toISOString().slice(0, 10),
        rowKey: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        userEmail: userEmail,
        eventType: eventType,
        eventData: JSON.stringify(eventData || {}),
        timestamp: now.toISOString()
    };

    await client.createEntity(entity);
    return entity;
}

/**
 * Write or update a module completion record.
 * PartitionKey = userEmail, RowKey = moduleId.
 */
async function writeCompletion(userEmail, moduleId, moduleName) {
    const client = getCompletionsClient();
    if (!client) throw new Error('Table Storage not configured');

    const entity = {
        partitionKey: userEmail.toLowerCase(),
        rowKey: moduleId,
        moduleName: moduleName || moduleId,
        completedAt: new Date().toISOString()
    };

    await client.upsertEntity(entity, 'Replace');
    return entity;
}

/**
 * Get all completions for a specific user.
 */
async function getUserCompletions(userEmail) {
    const client = getCompletionsClient();
    if (!client) return [];

    const results = [];
    const entities = client.listEntities({
        queryOptions: { filter: `PartitionKey eq '${userEmail.toLowerCase()}'` }
    });

    for await (const entity of entities) {
        results.push({
            moduleId: entity.rowKey,
            moduleName: entity.moduleName,
            completedAt: entity.completedAt
        });
    }
    return results;
}

/**
 * Get all completions (all users) for admin summary.
 */
async function getAllCompletions() {
    const client = getCompletionsClient();
    if (!client) return [];

    const results = [];
    const entities = client.listEntities();

    for await (const entity of entities) {
        results.push({
            userEmail: entity.partitionKey,
            moduleId: entity.rowKey,
            moduleName: entity.moduleName,
            completedAt: entity.completedAt
        });
    }
    return results;
}

/**
 * Query telemetry events for admin summary.
 * Returns events from the last N days.
 */
async function getTelemetryEvents(daysBack) {
    const client = getTelemetryClient();
    if (!client) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const results = [];
    const entities = client.listEntities({
        queryOptions: { filter: `PartitionKey ge '${cutoffDate}'` }
    });

    for await (const entity of entities) {
        results.push({
            userEmail: entity.userEmail,
            eventType: entity.eventType,
            eventData: JSON.parse(entity.eventData || '{}'),
            timestamp: entity.timestamp
        });
    }
    return results;
}

module.exports = {
    writeTelemetryEvent,
    writeCompletion,
    getUserCompletions,
    getAllCompletions,
    getTelemetryEvents
};
