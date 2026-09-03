import 'dotenv/config';
import app from './app.js';

const port = process.env.PORT || 3100;

app.listen(port, ()=>{
    console.log(`Server listening on port : ${port}`)
});