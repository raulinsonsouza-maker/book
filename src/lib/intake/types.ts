export type MaritalStatus =
  | "single"
  | "married"
  | "divorced"
  | "widowed"
  | "stable_union";

export type IntakePartner = {
  fullName: string;
  cpf: string;
  rgOrCnh: string;
  birthDate: string;
  nationality: string;
  maritalStatus: MaritalStatus;
  marriageRegime?: string;
  profession: string;
  address: string;
  zipCode: string;
  email: string;
  phone: string;
  /** CPF consta no documento de identidade — dispensa upload separado. */
  cpfOnIdDoc: boolean;
};

export type CompanyOpeningBrData = {
  partners: IntakePartner[];
  companyNameOptions: [string, string, string];
  tradeName: string;
  preferredLegalName: string;
  shareCapitalReais: string;
  ownership: { partnerIndex: number; percentage: number }[];
  administration: {
    administratorPartnerIndices: number[];
    mode: "sole" | "joint";
  };
  activities: string;
  headquarters: {
    address: string;
    zipCode: string;
    isRented: boolean;
  };
};

export type IntakeFileFieldDef = {
  key: string;
  label: string;
  hint: string;
  required: boolean;
  partnerIndex?: number;
};

export type IntakeStepDef = {
  id: string;
  title: string;
  description?: string;
};

export type IntakeTemplateDef = {
  key: string;
  title: string;
  maxFileBytes: number;
  allowedMimeTypes: string[];
  steps: IntakeStepDef[];
  defaultData: () => CompanyOpeningBrData;
};

export type IntakeAttachmentInfo = {
  id: string;
  fieldKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  partnerIndex: number | null;
};
