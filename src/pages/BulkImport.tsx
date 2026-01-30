import { BulkQuestionImporter } from "@/components/BulkQuestionImporter";
import { NavLink } from "@/components/NavLink";
import { FileText, Upload } from "lucide-react";

const BulkImport = () => {
  return (
    <div>
      {/* Navigation Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Question Craft</h2>
            <div className="flex gap-2">
              <NavLink
                to="/"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                activeClassName="bg-secondary text-secondary-foreground"
              >
                <FileText className="h-4 w-4" />
                Single Question
              </NavLink>
              <NavLink
                to="/bulk-import"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                activeClassName="bg-secondary text-secondary-foreground"
              >
                <Upload className="h-4 w-4" />
                Bulk Import
              </NavLink>
            </div>
          </div>
        </div>
      </div>
      <BulkQuestionImporter />
    </div>
  );
};

export default BulkImport;

