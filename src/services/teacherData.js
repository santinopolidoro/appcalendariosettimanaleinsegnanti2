const DB_NAME = 'teacherScheduleDB';
const STORE_NAME = 'teachers';
const SCHEDULE_STORE_NAME = 'schedule';

async function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(SCHEDULE_STORE_NAME)) {
        db.createObjectStore(SCHEDULE_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export const saveTeachersToDb = async (teachers) => {
  const db = await openDb();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  // Clear existing data
  await new Promise((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onerror = () => reject(clearRequest.error);
    clearRequest.onsuccess = () => resolve();
  });

  // Add new data
  for (const teacher of teachers) {
    await new Promise((resolve, reject) => {
      const request = store.add(teacher);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadTeachersFromDb = async () => {
  const db = await openDb();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
  });
};

export const saveScheduleToDb = async (schedule) => {
  const db = await openDb();
  const transaction = db.transaction(SCHEDULE_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SCHEDULE_STORE_NAME);

  // Clear existing schedule
  await new Promise((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onerror = () => reject(clearRequest.error);
    clearRequest.onsuccess = () => resolve();
  });

  // Save new schedule
  await new Promise((resolve, reject) => {
    const request = store.add({ id: 'current', data: schedule });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadScheduleFromDb = async () => {
  const db = await openDb();
  const transaction = db.transaction(SCHEDULE_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SCHEDULE_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get('current');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db.close();
      resolve(request.result ? request.result.data : {});
    };
  });
};