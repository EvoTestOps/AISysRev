import {
  createStore,
  action,
  Action,
  createTypedHooks,
  Thunk,
  thunk,
} from "easy-peasy";
import * as usersService from "../services/userService";
import { UserModel } from "./types";
import { demoUser } from "./mock";

const injections = {
  usersService,
};

interface StoreModel {
  user?: UserModel;
  setUser: Action<StoreModel, UserModel>;
  setUserMock: Action<StoreModel>;
  login: Thunk<StoreModel, { email: string; password: string }, Injections>;
}

export type Injections = typeof injections;

export const store = createStore<StoreModel>(
  {
    user: undefined,
    setUser: action((state, payload) => {
      state.user = payload;
    }),
    setUserMock: action((state) => {
      state.user = demoUser;
    }),
    login: thunk(async (actions, { email, password }, { injections }) => {
      const { usersService } = injections; // 👈 destructure the injections
      const user = await usersService.login(email, password);
      actions.setUser(user);
    }),
  },
  {
    injections,
  }
);

const typedHooks = createTypedHooks<StoreModel>();

export const useTypedStoreActions = typedHooks.useStoreActions;
export const useTypedStoreDispatch = typedHooks.useStoreDispatch;
export const useTypedStoreState = typedHooks.useStoreState;
