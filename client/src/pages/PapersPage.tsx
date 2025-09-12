import { useParams } from "wouter";
import { Layout } from "../components/Layout";
import { useTypedStoreState } from "../state/store";
import { TabButton } from "../components/TabButton";
import { NotFoundPage } from "./NotFound";
import { Paper } from "../state/types";
import { useEffect, useState } from "react";
import { fetchPapersForProject } from "../services/paperService";
import { Card, CardProps } from "../components/Card";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleQuestionMark,
  X,
} from "lucide-react";
import { Button } from "../components/Button";
import classNames from "classnames";
import { twMerge } from "tailwind-merge";

type SortOption = "INCLUDE_ASC" | "INCLUDE_DESC" | "NAME_ASC" | "NAME_DESC";

function sort_name_asc(paperA: Paper, paperB: Paper) {
  return paperA.title.localeCompare(paperB.title);
}
function sort_name_desc(paperA: Paper, paperB: Paper) {
  return paperB.title.localeCompare(paperA.title);
}

function sort_include_asc(paperA: Paper, paperB: Paper) {
  return paperA.title.localeCompare(paperB.title);
}
function sort_include_desc(paperA: Paper, paperB: Paper) {
  return paperB.title.localeCompare(paperA.title);
}

function get_sorter_fn(opt: SortOption) {
  switch (opt) {
    case "INCLUDE_ASC":
      return sort_include_asc;
    case "INCLUDE_DESC":
      return sort_include_desc;
    case "NAME_ASC":
      return sort_name_asc;
    case "NAME_DESC":
      return sort_name_desc;
    default:
      throw new Error("Should not happen");
  }
}

type PaperCardProps = {
  paper: Paper;
};

const PaperCard: React.FC<
  React.PropsWithChildren<CardProps> & PaperCardProps
> = ({ paper, ...rest }) => {
  const [open, setOpen] = useState(false);

  return (
    <Card {...rest} padding="p-0">
      <div
        className={twMerge(
          classNames(
            "rounded-lg p-4 grid grid-cols-[1fr_240px_30px] items-center content-center hover:cursor-pointer hover:bg-gray-50"
          )
        )}
        onClick={() => {
          setOpen(!open);
        }}
      >
        <div className="font-semibold text-sm">{paper.title}</div>
        <div className="text-center text-sm">0.0 %</div>
        <div>
          {!open && (
            <ChevronDown
              className="hover:cursor-pointer"
              onClick={() => {
                setOpen(true);
              }}
            />
          )}
          {open && (
            <ChevronUp
              className="hover:cursor-pointer"
              onClick={() => {
                setOpen(false);
              }}
            />
          )}
        </div>
      </div>
      {open && (
        <div className="pl-4 pr-4 pb-4">
          <div className="text-sm">{paper.abstract}</div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="red" size="xs">
              <div className="flex flex-row gap-2 items-center font-semibold">
                <X size={15} />
                <span>Exclude</span>
              </div>
            </Button>
            <Button variant="yellow" size="xs">
              <div className="flex flex-row gap-2 items-center font-semibold">
                <CircleQuestionMark size={15} />
                <span>Unsure</span>
              </div>
            </Button>
            <Button variant="green" size="xs">
              <div className="flex flex-row gap-2 items-center font-semibold">
                <Check size={15} />
                <span>Include</span>
              </div>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export const PapersPage = () => {
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;
  const loadingProjects = useTypedStoreState((state) => state.loading.projects);
  const getProjectByUuid = useTypedStoreState(
    (state) => state.getProjectByUuid
  );
  const project = getProjectByUuid(uuid);

  const [papers, setPapers] = useState<Paper[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("NAME_ASC");

  const sortedPapers = papers.sort(get_sorter_fn(sortOption));

  useEffect(() => {
    async function fetchPapers() {
      const papers: Paper[] = await fetchPapersForProject(uuid);
      return papers;
    }
    if (project !== undefined) {
      fetchPapers().then((papers) => setPapers(papers));
    }
  }, [project, uuid]);

  if (loadingProjects) {
    return null;
  }
  if (project === undefined) {
    return <NotFoundPage />;
  }

  return (
    <Layout title={project.name}>
      <div className="flex flex-row mb-4">
        <TabButton href={`/project/${params.uuid}`}>Tasks</TabButton>
        <TabButton href={`/project/${params.uuid}/papers`} active>
          List of papers
        </TabButton>
      </div>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_240px_30px] p-4">
          <div className="flex flex-row gap-1 items-center content-center">
            <span
              className="font-bold select-none hover:cursor-pointer"
              onClick={() => {
                if (sortOption === "NAME_ASC") {
                  setSortOption("NAME_DESC");
                } else {
                  setSortOption("NAME_ASC");
                }
              }}
            >
              Name
            </span>
            {sortOption === "NAME_ASC" && (
              <ChevronDown
                className="hover:cursor-pointer"
                onClick={() => {
                  setSortOption("NAME_DESC");
                }}
              />
            )}
            {sortOption === "NAME_DESC" && (
              <ChevronUp
                className="hover:cursor-pointer"
                onClick={() => {
                  setSortOption("NAME_ASC");
                }}
              />
            )}
          </div>
          <div className="flex flex-row gap-1 items-center content-center justify-center">
            <span
              className="font-bold select-none hover:cursor-pointer"
              onClick={() => {
                if (sortOption === "INCLUDE_ASC") {
                  setSortOption("INCLUDE_DESC");
                } else {
                  setSortOption("INCLUDE_ASC");
                }
              }}
            >
              Probability of inclusion
            </span>
            {sortOption === "INCLUDE_DESC" && (
              <ChevronDown
                className="hover:cursor-pointer"
                onClick={() => {
                  setSortOption("INCLUDE_ASC");
                }}
              />
            )}
            {sortOption === "INCLUDE_ASC" && (
              <ChevronUp
                className="hover:cursor-pointer"
                onClick={() => {
                  setSortOption("INCLUDE_DESC");
                }}
              />
            )}
          </div>
          <div></div>
        </div>
        <div className="flex flex-col gap-1">
          {sortedPapers.map((paper) => (
            <PaperCard key={paper.uuid} paper={paper} />
          ))}
        </div>
      </div>
    </Layout>
  );
};
