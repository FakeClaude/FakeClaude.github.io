function generateUUID() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function getUserId() {
  let userId = localStorage.getItem("possmap_userId");
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem("possmap_userId", userId);
  }
  return userId;
}