import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: herokuSSLSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

// Get all posts from database

app.get("/pastes", async (req, res) => {
  try {
    const dbres = await client.query('select * from posts where (not can_expire) or (expiration >= now() and can_expire) order by date desc');
    res.send(dbres.rows)
  } catch (error) {
    console.error(error);
  }
});

// Add a new post to the database

app.post("/pastes", async (req, res) => {
  // console.log(req.body)
  try {
    const { post_id, title, language, expiration, date, password, content } = req.body;

    const text =
    "INSERT INTO posts VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *";
    const values = [post_id,title,language === 'none' ? null: language,date,expiration,expiration === date ? false:true,password === '' ? null: password,content];

    const response = await client.query(text, values);

    res.status(201).json({
      status: "success",
      data: response.rows
    });
  } catch (error) {
    console.error(error);
  }
});

// Update a post from the database

app.put("/pastes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {title, language, expiration, date, password, content } = req.body;
    await client.query(
      "UPDATE posts SET title = $2, language = $3, expiration = $4,date=$5, password = $6, content = $7, can_expire = $8 WHERE post_id = $1",
      [id,title,language === 'none' ? null: language,expiration,date,password === '' ? null: password,content,expiration,expiration === date ? false:true]
    );

    res.status(201).json({
      status: "success"
    });
  } catch (err) {
    console.error(err.message);
  }
});

// Get a post specified by id

app.get("/pastes/:id", async (req, res) =>{
  const {id} = req.params;
  const response = await client.query('select * from posts where post_id = $1',[id]);
  res.status(201).json({
    status: "success",
    data: response.rows[0]
  });
});

// Delete a post from the database

app.delete("/pastes/:id", async (req,res) =>{
  try {
    const { id } = req.params;
    await client.query("DELETE FROM posts WHERE post_id = $1 ", [
      id
    ]);

    res.status(201).json({
      status: "success"
    });
  } catch (err) {
    console.log(err.message);
  }
});


//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
