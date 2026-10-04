/**
 * How a hook reports outcomes to the user. `toast` from react-toastify fits;
 * tests can pass a stub instead.
 */
export type Notifier = {
  success: (message: string) => void;
  error: (message: string) => void;
};
