import { db } from '../../app/config/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';

export { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit };
