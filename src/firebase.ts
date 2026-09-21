import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDaUNAQy9GQY4fh8e38r3wsjMrT1aNWqpo',
  authDomain: 'comers-5e927.firebaseapp.com',
  projectId: 'comers-5e927',
  storageBucket: 'comers-5e927.firebasestorage.app',
  messagingSenderId: '426957193439',
  appId: '1:426957193439:web:06e82e51790e0ce828296a',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
