import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase, closeDatabase } from "../db.js";
import { Author, Book, Loan, Member, Reservation, User } from "../models/index.js";
import { addDays } from "../lib/circulation.js";

await connectDatabase();
await mongoose.connection.dropDatabase();

const passwordHash = await bcrypt.hash("admin123", 12);
const [admin, librarian] = await User.create([
  { name: "Project Administrator", email: "admin@library.edu", passwordHash, role: "admin" },
  { name: "Library Staff", email: "librarian@library.edu", passwordHash, role: "librarian" }
]);

const authorNames = [
  "Abraham Silberschatz", "Henry Korth", "S. Sudarshan", "Martin Kleppmann",
  "Pramod Sadalage", "Eric Redmond", "Kristina Chodorow", "Kyle Banker",
  "Ian Robinson", "Jim Webber", "Emil Eifrem", "Guy Harrison", "Alex Petrov",
  "Bill Karwin", "Joe Celko", "C. J. Date", "Raghu Ramakrishnan",
  "Johannes Gehrke", "Hector Garcia-Molina", "Jeffrey Ullman"
];
const countries = ["India", "USA", "UK", "Canada", "Germany"];
await Author.insertMany(authorNames.map((name, i) => ({
  _id: `A${String(i + 1).padStart(3, "0")}`,
  name,
  country: countries[i % countries.length]
})));

const titles = [
  "Database System Concepts", "Designing Data-Intensive Applications", "NoSQL Distilled",
  "Seven Databases in Seven Weeks", "MongoDB: The Definitive Guide", "MongoDB in Action",
  "Graph Databases", "Next Generation Databases", "Database Internals", "SQL Antipatterns"
];
const categories = ["Database", "Programming", "Networks", "Artificial Intelligence", "Security", "Cloud"];
const publishers = ["Pearson", "McGraw Hill", "O'Reilly", "Springer", "MIT Press"];
const books = Array.from({ length: 40 }, (_, i) => {
  const total = i < 6 ? 1 : 3 + (i % 5);
  const activeIssued = i < 12 ? 1 : 0;
  return {
    _id: `B${String(i + 1).padStart(3, "0")}`,
    isbn: `978000${String(1000000 + i).slice(-7)}`,
    title: `${titles[i % titles.length]}${i >= 10 ? ` - Volume ${Math.floor(i / 10) + 1}` : ""}`,
    authors: [`A${String((i % 20) + 1).padStart(3, "0")}`, `A${String(((i + 3) % 20) + 1).padStart(3, "0")}`],
    category: categories[i % categories.length],
    publisher: publishers[i % publishers.length],
    edition: 1 + (i % 8),
    year: 2016 + (i % 11),
    copies: { total, available: Math.max(0, total - activeIssued) }
  };
});
await Book.insertMany(books);

const departments = ["Computer Science", "Data Science", "Electronics", "Mechanical", "Business"];
await Member.insertMany(Array.from({ length: 30 }, (_, i) => ({
  _id: `M${String(i + 1).padStart(3, "0")}`,
  name: `Member ${String(i + 1).padStart(2, "0")}`,
  department: departments[i % departments.length],
  email: `member${i + 1}@vitstudent.ac.in`,
  phone: `98${String(70000000 + i).slice(-8)}`,
  membershipType: i % 6 === 0 ? "Faculty" : "Student",
  active: i % 13 !== 0
})));

const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const loans = Array.from({ length: 30 }, (_, i) => {
  const active = i < 12;
  const issueDate = addDays(today, -(45 - i));
  const dueDate = addDays(issueDate, 14);
  const returnDate = active ? null : addDays(dueDate, (i % 5) - 2);
  return {
    _id: `L${String(i + 1).padStart(3, "0")}`,
    bookId: `B${String((i % 40) + 1).padStart(3, "0")}`,
    memberId: `M${String((i % 30) + 1).padStart(3, "0")}`,
    issueDate,
    dueDate,
    returnDate,
    status: active ? "Issued" : "Returned",
    fine: !active && returnDate > dueDate ? Math.ceil((returnDate - dueDate) / 86400000) * 10 : 0,
    renewals: 0,
    issuedBy: i % 2 ? librarian._id : admin._id
  };
});
await Loan.insertMany(loans);

await Reservation.insertMany(Array.from({ length: 15 }, (_, i) => ({
  _id: `R${String(i + 1).padStart(3, "0")}`,
  bookId: `B${String((i % 6) + 1).padStart(3, "0")}`,
  memberId: `M${String(((i + 15) % 30) + 1).padStart(3, "0")}`,
  reservationDate: addDays(today, -(15 - i)),
  status: i < 12 ? "Active" : "Cancelled"
})));

await Promise.all([Author.syncIndexes(), Book.syncIndexes(), Member.syncIndexes(), Loan.syncIndexes(), Reservation.syncIndexes(), User.syncIndexes()]);

const validators = {
  authors: { $jsonSchema: { bsonType: "object", required: ["_id", "name", "country"] } },
  books: { $jsonSchema: { bsonType: "object", required: ["_id", "isbn", "title", "authors", "category", "copies"], properties: { copies: { bsonType: "object", required: ["total", "available"], properties: { total: { bsonType: ["int", "long", "double"], minimum: 0 }, available: { bsonType: ["int", "long", "double"], minimum: 0 } } } } } },
  members: { $jsonSchema: { bsonType: "object", required: ["_id", "name", "email", "membershipType", "active"] } },
  loans: { $jsonSchema: { bsonType: "object", required: ["_id", "bookId", "memberId", "issueDate", "dueDate", "status", "fine"], properties: { status: { enum: ["Issued", "Returned"] }, fine: { minimum: 0 }, renewals: { bsonType: ["int", "long", "double"], minimum: 0, maximum: 2 } } } },
  reservations: { $jsonSchema: { bsonType: "object", required: ["_id", "bookId", "memberId", "reservationDate", "status"], properties: { status: { enum: ["Active", "Fulfilled", "Cancelled"] } } } },
  users: { $jsonSchema: { bsonType: "object", required: ["name", "email", "passwordHash", "role", "active"], properties: { role: { enum: ["admin", "librarian"] } } } }
};

for (const [collection, validator] of Object.entries(validators)) {
  await mongoose.connection.db.command({ collMod: collection, validator, validationLevel: "strict", validationAction: "error" });
}

const collections = ["authors", "books", "members", "loans", "reservations", "users"];
const counts = Object.fromEntries(await Promise.all(collections.map(async (name) => [name, await mongoose.connection.db.collection(name).countDocuments()])));
counts.total = Object.values(counts).reduce((sum, value) => sum + value, 0);
console.log("Seed complete", counts);
console.log("Login: admin@library.edu / admin123");
await closeDatabase();
