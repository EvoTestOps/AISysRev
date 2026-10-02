import { Link } from "wouter";
import { useConfig } from "../../../config/config";

type ConfigKeyCheckProps = {
  config_key: string;
  title: string;
  should_show: boolean;
};

export const ConfigKeyCheck: React.FC<ConfigKeyCheckProps> = ({
  config_key,
  should_show,
  title,
}) => {
  const { loading, setting } = useConfig(config_key);
  return !loading && setting == null && should_show ? (
    <div>
      <div
        className="inline-flex bg-red-300 rounded-md p-4 items-center w-full"
        data-testid={`error-missing-${config_key}`}
      >
        <span className="font-bold text-sm text-red-900 select-none">
          {title} is not set.
          <br />
          <Link className="text-blue-800" to="/settings">
            Go to settings
          </Link>
        </span>
      </div>
    </div>
  ) : null;
};
