declare module "views" {
  // Import all view components
  import TestCaseView from "./TestCaseView";
  import TestView from "./TestView";
  import SuiteView from "./SuiteView";
  import SectionView from "./SectionView";
  import RunView from "./RunView";
  import ResultView from "./ResultView";
  import MilestoneView from "./MilestoneView";

  // Export all components
  export {
    TestCaseView,
    TestView,
    SuiteView,
    SectionView,
    RunView,
    ResultView,
    MilestoneView,
  };
}
