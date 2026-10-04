const corsOptions = {
  origin: ["https://frontend-kzov.onrender.com", process.env.CLIENT_URL],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const CHATTU_TOKEN = "chattu-token";

export { corsOptions, CHATTU_TOKEN };