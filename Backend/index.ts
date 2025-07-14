import 'dotenv/config'
import app from "./src/app"
import { DBconnect } from "./src/Db/db"

console.log("here")
console.log("fuck")

DBconnect()
.then(()=>{
   app.listen(process.env.PORT || 8080, () => {
        console.log("Server is running");
   })
})