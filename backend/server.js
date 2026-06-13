import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./db/config.js";

const PORT = env.PORT;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
