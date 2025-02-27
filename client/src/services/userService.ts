import axios from "axios";
import { UserModel } from "../state/types";

export const login = async (
  email: string,
  password: string
): Promise<UserModel> => {
  const payload = {
    email,
    password,
  };
  await axios.post("/api/v1/login", payload);
  return {
    email: "someone@example.com",
    name: "Example Uesr",
  };
};
