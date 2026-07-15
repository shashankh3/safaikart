import { db } from '../../app/config/firebase';
import {collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, writeBatch} from '@react-native-firebase/firestore';

export { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, writeBatch };
