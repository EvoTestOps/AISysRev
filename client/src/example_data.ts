import { Criteria } from "./llm/types";

export const exampleCriteria: Array<Criteria> = [
  {
    id: 1,
    criteria: "The main focus is time pressure in software engineering",
  },
  {
    id: 2,
    criteria:
      "The paper presents empirical evidence of time pressure in software engineering",
  },
];

export const exampleTitle =
  "Time pressure in software engineering: A systematic review";

export const exampleAbstract = `Context
Large project overruns and overtime work have been reported in the software industry, resulting in additional expense for companies and personal issues for developers. Experiments and case studies have investigated the relationship between time pressure and software quality and productivity.
Objective
The present work aims to provide an overview of studies related to time pressure in software engineering; specifically, existing definitions, possible causes, and metrics relevant to time pressure were collected, and a mapping of the studies to software processes and approaches was performed. Moreover, we synthesize results of existing quantitative studies on the effects of time pressure on software development, and offer practical takeaways for practitioners and researchers, based on empirical evidence.
Method
Our search strategy examined 5414 sources, found through repository searches and snowballing. Applying inclusion and exclusion criteria resulted in the selection of 102 papers, which made relevant contributions related to time pressure in software engineering.
Results
The majority of high quality studies report increased productivity and decreased quality under time pressure. The most frequent categories of studies focus on quality assurance, cost estimation, and process simulation. It appears that time pressure is usually caused by errors in cost estimation. The effect of time pressure is most often identified during software quality assurance.
Conclusions
The majority of empirical studies report increased productivity under time pressure, while the most cost estimation and process simulation models assume that compressing the schedule increases the total needed hours. We also find evidence of the mediating effect of knowledge on the effects of time pressure, and that tight deadlines impact tasks with an algorithmic nature more severely. Future research should better contextualize quantitative studies to account for the existing conflicting results and to provide an understanding of situations when time pressure is either beneficial or harmful.`;
