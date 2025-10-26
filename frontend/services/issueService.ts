import { Issue, IssueStatus, Priority, ActionPlan } from '../types';
import { db, storage } from './firebase';
import { 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  collection 
} from "firebase/firestore";
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from "firebase/storage";

// The local storage and dummy data logic is no longer needed.
// Firestore is now the single source of truth.

const generateId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};


export type NewIssueData = Omit<Issue, 'id' | 'createdAt' | 'status' | 'photoUrl' | 'actionPlan'> & { photoFile: File };

export const addIssue = (newIssueData: NewIssueData, onProgress: (progress: number) => void): Promise<Issue> => {
  const uploadPromise = new Promise<Issue>(async (resolve, reject) => {
    const { photoFile, ...issueData } = newIssueData;

    // 1. Upload image to Firebase Storage with progress tracking
    const photoId = generateId();
    const storageRef = ref(storage, `issues/${photoId}-${photoFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, photoFile);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(Math.round(progress));
      },
      (error) => {
        console.error("Upload failed", error);
        reject(error);
      },
      async () => {
        try {
          // 2. Get the public URL for the image
          const photoUrl = await getDownloadURL(uploadTask.snapshot.ref);

          // 3. Create the new issue object to be stored in Firestore
          const newIssueForDb = {
            ...issueData,
            photoUrl,
            createdAt: new Date().toISOString(),
            status: IssueStatus.PENDING,
          };

          // 4. Add the issue document to the 'issues' collection
          const docRef = await addDoc(collection(db, 'issues'), newIssueForDb);

          // 5. Return the full Issue object, including the new Firestore ID
          const newIssue: Issue = {
            ...issueData,
            id: docRef.id,
            photoUrl,
            createdAt: newIssueForDb.createdAt,
            status: newIssueForDb.status,
          };

          resolve(newIssue);
        } catch (dbError) {
          console.error("Failed to save issue to Firestore", dbError);
          reject(dbError);
        }
      }
    );
  });
  
  const timeoutPromise = new Promise<Issue>((_, reject) => {
    setTimeout(() => {
      const timeoutError = new Error("Upload timed out after 30 seconds.");
      timeoutError.name = 'UploadTimeout';
      reject(timeoutError);
    }, 30000); // 30-second timeout
  });

  return Promise.race([uploadPromise, timeoutPromise]);
};

export const getIssueById = async (id: string): Promise<Issue | undefined> => {
  const issueDocRef = doc(db, 'issues', id);
  const issueDoc = await getDoc(issueDocRef);

  if (issueDoc.exists()) {
    return { id: issueDoc.id, ...issueDoc.data() } as Issue;
  }
  return undefined;
};

export const updateIssueStatus = async (id: string, status: IssueStatus): Promise<void> => {
  const issueDocRef = doc(db, 'issues', id);
  await updateDoc(issueDocRef, { status });
};

export const updateIssuePriority = async (id: string, priority: Priority): Promise<void> => {
  const issueDocRef = doc(db, 'issues', id);
  await updateDoc(issueDocRef, { priority });
};

export const updateIssueActionPlan = async (id: string, actionPlan: ActionPlan): Promise<void> => {
  const issueDocRef = doc(db, 'issues', id);
  await updateDoc(issueDocRef, { actionPlan });
};

export const seedInitialIssues = async (): Promise<void> => {
  console.log('Seeding initial issues...');
  const issuesCollection = collection(db, 'issues');
  
  const dummyIssues: Omit<Issue, 'id'>[] = [
    {
      title: "Major Pothole on University Road",
      description: "A very large and dangerous pothole has formed near the main gate of the university. It's causing traffic issues and could damage vehicles.",
      summary: "A large, dangerous pothole is causing traffic problems near the university.",
      photoUrl: "https://picsum.photos/seed/pothole/800/600",
      tags: ["road_damage", "pothole", "traffic_hazard"],
      priority: Priority.HIGH,
      location: { lat: 21.1702, lon: 72.8311 }, // Surat
      status: IssueStatus.PENDING,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
    {
      title: "Streetlight Out at City Park Corner",
      description: "The streetlight at the corner of City Park and 5th Avenue has been out for three nights. It's very dark and feels unsafe.",
      summary: "A streetlight is out, creating a dark and potentially unsafe area at a park corner.",
      photoUrl: "https://picsum.photos/seed/streetlight/800/600",
      tags: ["street_light", "public_safety", "electrical"],
      priority: Priority.MEDIUM,
      location: { lat: 21.1959, lon: 72.8302 }, // Near Surat
      status: IssueStatus.IN_PROGRESS,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      actionPlan: {
          steps: ["Inspect fixture and wiring", "Replace bulb and ballast", "Verify timer functionality"],
          crew: "Electrical Services",
          estimatedHours: 2
      }
    },
    {
      title: "Overflowing Public Trash Can",
      description: "The trash can at the bus stop on Diamond Street is completely full and overflowing. Garbage is blowing into the street.",
      summary: "A public trash can at a bus stop is overflowing, causing a sanitation issue.",
      photoUrl: "https://picsum.photos/seed/trash/800/600",
      tags: ["sanitation", "waste_management", "public_space"],
      priority: Priority.LOW,
      location: { lat: 21.2084, lon: 72.8408 }, // Another spot in Surat
      status: IssueStatus.RESOLVED,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    },
     {
      title: "Broken Bench in Central Park",
      description: "One of the wooden benches near the fountain in Central Park has a broken leg and is unusable. It could be a safety hazard for children.",
      summary: "A park bench is broken and unusable, posing a potential safety risk.",
      photoUrl: "https://picsum.photos/seed/bench/800/600",
      tags: ["park_maintenance", "vandalism", "public_furniture"],
      priority: Priority.MEDIUM,
      location: { lat: 21.1775, lon: 72.8165 }, // Another spot
      status: IssueStatus.PENDING,
      createdAt: new Date().toISOString(), // Today
    }
  ];

  try {
    for (const issue of dummyIssues) {
      await addDoc(issuesCollection, issue);
    }
    console.log('Finished seeding issues.');
  } catch (error) {
    console.error("Error seeding database: ", error);
  }
};