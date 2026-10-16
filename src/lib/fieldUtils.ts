export const JOB_FIELD_LABELS: Record<string, string> = {
    title: "Job Title",
    description: "Description",
    status: "Status",
    ownerId: "Owner",
    owner: "Owner",
    departmentId: "Department",
    department: "Department",
    budgetLimit: "Budget Limit",
    workMode: "Work Mode",
    salaryMin: "Minimum Salary",
    salaryMax: "Maximum Salary",
    createdAt: "Created Date",
    updatedAt: "Last Modified Date",
    createdBy: "Created By",
    lastModifiedBy: "Last Modified By",
    createdById: "Created By",
    lastModifiedById: "Last Modified By",
    createdDate: "Created Date",
    lastModifiedDate: "Last Modified Date",
};


export const RECORD_PAGE_EXCLUDED_FIELDS = new Set([
    "id",
    "deletedAt",
    "password",
    "accessToken",
]);


const SYSTEM_FIELD_NAMES = new Set([
    "createdAt",
    "updatedAt",
    "createdBy",
    "lastModifiedBy",
    "createdById",
    "lastModifiedById",
    "createdDate",
    "lastModifiedDate",
]);


const DESCRIPTION_FIELD_NAMES = new Set(["description"]);


const TITLE_FIELD_NAMES = new Set(["title", "name"]);


const CURRENCY_FIELD_PATTERNS = ["budget", "salary", "amount", "price", "cost"];


const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;


function humanizeApiName(apiName: string): string {
    return apiName
        .replace(/Id$/, "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, (c) => c.toUpperCase());
}


export function getFieldLabel(
    apiName: string,
    metadataLabel?: string
): string {
    if (JOB_FIELD_LABELS[apiName]) return JOB_FIELD_LABELS[apiName];
    if (metadataLabel) return metadataLabel;
    return humanizeApiName(apiName);
}


export function resolveFieldDisplayValue(
    record: Record<string, any>,
    fieldApiName: string
): string {
    if (!record) return "-";


    let val = record[fieldApiName];


    if (typeof val === "string" && fieldApiName.endsWith("Id")) {
        const relationKey = fieldApiName.replace(/Id$/, "");
        const related = record[relationKey];
        if (related && typeof related === "object") {
            if (related.firstName || related.lastName) {
                return `${related.firstName || ""} ${related.lastName || ""}`.trim() || "-";
            }
            if (related.name) return related.name;
            if (related.label) return related.label;
        }
    }


    if (val && typeof val === "object" && !Array.isArray(val)) {
        if (val.firstName || val.lastName) {
            return `${val.firstName || ""} ${val.lastName || ""}`.trim() || "-";
        }
        if (val.name) return val.name;
        if (val.label) return val.label;
        return JSON.stringify(val);
    }


    if (typeof val === "boolean") return val ? "Yes" : "No";


    if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "-";


    if (val == null) return "-";


    if (typeof val === "number") {
        const lowerName = fieldApiName.toLowerCase();
        if (CURRENCY_FIELD_PATTERNS.some((p) => lowerName.includes(p))) {
            return `₹${val.toLocaleString("en-IN")}`;
        }
        return String(val);
    }


    if (typeof val === "string" && ISO_DATE_REGEX.test(val)) {
        try {
            if (val.includes("T") || val.endsWith("Z")) {
                return new Date(val).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                });
            }
            return new Date(val).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return val;
        }
    }


    return String(val);
}


interface FieldMeta {
    apiName: string;
    label?: string;
    allowRead?: boolean;
    allowEdit?: boolean;
}


interface ClassifiedFields {
    highlights: FieldMeta[];
    details: FieldMeta[];
    systemInfo: FieldMeta[];
    description: FieldMeta[];
    titleField: FieldMeta | null;
}


export function classifyRecordFields(
    fields: FieldMeta[],
    excludedFields: Set<string> = RECORD_PAGE_EXCLUDED_FIELDS,
    maxHighlights: number = 4
): ClassifiedFields {
    const readable = fields.filter(
        (f) => f.allowRead !== false && !excludedFields.has(f.apiName)
    );


    const systemInfo: FieldMeta[] = [];
    const description: FieldMeta[] = [];
    let titleField: FieldMeta | null = null;
    const standard: FieldMeta[] = [];


    for (const f of readable) {
        if (SYSTEM_FIELD_NAMES.has(f.apiName)) {
            systemInfo.push(f);
        } else if (DESCRIPTION_FIELD_NAMES.has(f.apiName)) {
            description.push(f);
        } else if (TITLE_FIELD_NAMES.has(f.apiName)) {
            titleField = f;
        } else {
            standard.push(f);
        }
    }


    const highlights = standard.slice(0, maxHighlights);
    const details = standard.slice(maxHighlights);


    return { highlights, details, systemInfo, description, titleField };
}



