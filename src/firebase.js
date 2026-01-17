// Firebase configuration for Hoodie Globe
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyB1zFyx7ceMaaPaBqWHU39oHz-KrCgxseo",
    authDomain: "hoodie-globe.firebaseapp.com",
    projectId: "hoodie-globe",
    storageBucket: "hoodie-globe.firebasestorage.app",
    messagingSenderId: "782830832038",
    appId: "1:782830832038:web:437a31dcf38434afa32767"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Save message to Firestore
export async function saveMessage(messageData) {
    try {
        const docRef = await addDoc(collection(db, 'messages'), {
            text: messageData.text,
            senderLocation: {
                lat: messageData.startLat,
                lng: messageData.startLng
            },
            destinationLocation: {
                lat: messageData.endLat,
                lng: messageData.endLng
            },
            createdAt: serverTimestamp(),
            printed: false
        });
        console.log('Message saved with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
}

export { db };
