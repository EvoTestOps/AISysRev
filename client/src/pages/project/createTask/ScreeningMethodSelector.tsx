import { Gauge, Sparkles } from "lucide-react";
import { RadioCard } from "./controls";
import { CreateTaskForm, ScreeningMethod } from "../hooks/useCreateTaskForm";

/** LLM screening or Jev screening. Hidden when the backend offers no Jev provider. */
export const ScreeningMethodSelector: React.FC<{ form: CreateTaskForm }> = ({ form }) => {
  if (!form.jevProvider) {
    return null;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <RadioCard
        testId="screening-method-llm-button"
        selected={!form.isJevScreening}
        onSelect={() => form.selectScreeningMethod(ScreeningMethod.LLM)}
        icon={<Sparkles size={16} className="text-blue-600" />}
        iconClassName="bg-blue-100"
        title="LLM screening"
        description="A language model judges each criterion and explains its decision."
      />
      <RadioCard
        testId="screening-method-jev-button"
        selected={form.isJevScreening}
        onSelect={() => form.selectScreeningMethod(ScreeningMethod.JEV)}
        icon={<Gauge size={16} className="text-emerald-600" />}
        iconClassName="bg-emerald-100"
        title="Jev screening"
        description="TypeSafe Jev returns a probability per criterion, all in one request."
      />
    </div>
  );
};
