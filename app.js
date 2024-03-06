const express = require("express");
const path = require("path");
const http = require("http");
var bodyParser = require("body-parser");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const Excel = require("exceljs");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const mongoURI =
  "mongodb+srv://thinkbook:r3QrFhy24WJ7Ows2@cluster0.adizfd5.mongodb.net/"; // MongoDB connection URI
const dbName = "Abacus_Test"; // Name of your database
const collectionName = "third_grade_exam_result"; // Name of your collection

app.use(bodyParser.json());
app.use(cors());

let db;
MongoClient.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then((client) => {
    console.log("Connected to MongoDB");
    db = client.db(dbName);
  })
  .catch((err) => console.error("Error connecting to MongoDB:", err));

app.use(express.static(path.join(__dirname, "public")));

// app.get("/", async (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });

app.get("/sign-up3", async (req, res) => {
  res.sendFile(path.join(__dirname, "public", "3rd_registration.html"));
});

app.post("/register3", async (req, res) => {
  try {
    const data = req.body;

    // Check if data is defined
    if (!data) {
      //return res.sendFile(path.join(__dirname, "public", "error.html"));
      const redirectUrl = "http://localhost:3000/error.html";
      return res.status(200).json({ redirectUrl });
    }

    // Construct unique URL
    const uniqueURL = data.name + "-" + data.school + "-" + data.roll;

    // Check if the student is already registered
    const existingStudent = await db
      .collection(collectionName)
      .findOne({ name: data.name, school: data.school, roll: data.roll });

    // If the student is already registered, check if the URL has been used
    if (existingStudent) {
      if (existingStudent.isUrlUsed) {
        // If the URL has been used, return error
        //return res.status(400).json({ error: "Student is already registered and URL has been used" });
        //return res.sendFile(path.join(__dirname, "public", "registered.html"));
        const redirectUrl = "http://localhost:3000/registered.html";
        return res.status(200).json({ redirectUrl });
      } else {
        // If the URL has not been used, update the URL and return it
        const redirectUrl = `/test/${encodeURIComponent(uniqueURL)}`;
        await db
          .collection(collectionName)
          .updateOne(
            { name: data.name, school: data.school, roll: data.roll },
            { $set: { redirectUrl } }
          );
        console.log(
          "3rd grade student already registered. Updated URL:",
          redirectUrl
        );
        return res.status(200).json({ redirectUrl });
      }
    }

    // If the student is not registered, insert them into the database
    const result = await db.collection(collectionName).insertOne({
      ...data,
      redirectUrl: `/test/${encodeURIComponent(uniqueURL)}`,
      isUrlUsed: false,
    });
    console.log("3rd grade student registered:", result.insertedId);
    return res
      .status(200)
      .json({ redirectUrl: `/test/${encodeURIComponent(uniqueURL)}` });
  } catch (error) {
    console.error("Error inserting data:", error);
    // return res.status(500).json({ error: "Internal Server Error" });
    // return res.sendFile(path.join(__dirname, "public", "error.html"));
    const redirectUrl = "http://localhost:3000/error.html";
    return res.status(200).json({ redirectUrl });
  }
});

// Test page route
app.get("/test/:uniqueURL", async (req, res) => {
  try {
    const uniqueURL = req.params.uniqueURL;
    console.log("unique url is in in this api", uniqueURL);
    const [name, school, roll] = uniqueURL.split("-");

    // Query MongoDB to find the student record
    const student = await db
      .collection(collectionName)
      .findOne({ name, school, roll, isUrlUsed: false });
    if (!student) {
      // If no student record is found, handle the error accordingly
      //return res.status(404).send("Student not found");
      return res.sendFile(path.join(__dirname, "public", "snfound.html"));
    }

    // Pass the student data to the test page
    res.sendFile(path.join(__dirname, "public", "test", "index.html"), {
      student,
    });
  } catch (error) {
    console.error("Error:", error);
    // res.status(500).send("Internal Server Error");
    return res.sendFile(path.join(__dirname, "public", "error.html"));
  }
});

// app.post("/submit_third_grade_exam_result", async (req, res) => {
//   try {
//     // Assuming req.body contains the data to be stored in MongoDB
//     const data = req.body;
//     if (data !== undefined) {
//         let student = data.shift();
//       let jsonData = {};
//       for (let i = 0; i < data.length; i++) {
//         jsonData[i + 1] = data[i].isCorrect;
//       }
//       jsonData.time = +new Date();

//       const result = await db.collection(collectionName).insertOne(jsonData);
//       console.log("Data inserted:", result.insertedId);
//       return res.sendFile(path.join(__dirname, "public", "success.html"));
//     }
//   } catch (error) {
//     console.error("Error inserting data:", error);
//     // Send error response
//     return res.sendFile(path.join(__dirname, "public", "error.html"));
//   }
// });
app.post("/submit_third_grade_exam_result", async (req, res) => {
  try {
    // Assuming req.body contains the data to be stored in MongoDB
    const data = req.body;
    if (data !== undefined && Array.isArray(data)) {
      // Extract the student information from the array
      const student = data.shift();

      // Query the database to find the student
      const studentData = await db.collection(collectionName).findOne({
        name: student.name,
        school: student.school,
        roll: student.roll,
      });

      // If student data is not found, return an error
      if (!studentData) {
        throw new Error("Student not found in the database");
      }

      // Initialize an empty object to store test data
      const jsonData = {};

      // Populate jsonData with test data
      for (let i = 0; i < data.length; i++) {
        jsonData[i + 1] = data[i].isCorrect;
      }

      // Add timestamp to jsonData
      jsonData.time = +new Date();

      // Update the document in the MongoDB collection
      const result = await db.collection(collectionName).updateOne(
        { _id: studentData._id }, // Filter for the document to update
        { $set: { isUrlUsed: true, ...jsonData } } // Update operation
      );
      console.log("Data updated:", result.modifiedCount);

      // Send success response
      return res.sendFile(path.join(__dirname, "public", "success.html"));
    } else {
      throw new Error("Invalid data format");
    }
  } catch (error) {
    console.error("Error updating data:", error);
    // Send error response
    return res.sendFile(path.join(__dirname, "public", "error.html"));
  }
});

app.get("/download-excel", async (req, res) => {
  try {
    // Connect to MongoDB
    const client = await MongoClient.connect(mongoURI, {
      useUnifiedTopology: true,
    });
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Fetch data from MongoDB
    const data = await collection.find({}).toArray();

    // Create a new Excel workbook
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    // Add headers to the worksheet
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Add data to the worksheet
    data.forEach((item) => {
      const row = [];
      headers.forEach((header) => {
        row.push(item[header]);
      });
      worksheet.addRow(row);
    });

    // Set response headers for Excel download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="data.xlsx"');

    // Generate Excel file and send it in the response
    await workbook.xlsx.write(res);
    await client.close();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
