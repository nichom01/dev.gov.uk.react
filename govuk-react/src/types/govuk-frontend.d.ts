// govuk-frontend ships JavaScript with JSDoc but no .d.ts files. Declare the
// component classes this library initialises. When you wrap another upstream
// JS component, add it here.
declare module "govuk-frontend" {
  interface GovukComponent {
    readonly $root: Element;
  }
  interface GovukComponentClass<Config = unknown> {
    new ($root: Element, config?: Config): GovukComponent;
    moduleName: string;
  }

  export const Accordion: GovukComponentClass;
  export const Button: GovukComponentClass<{ preventDoubleClick?: boolean }>;
  export const CharacterCount: GovukComponentClass;
  export const Checkboxes: GovukComponentClass;
  export const ErrorSummary: GovukComponentClass;
  export const ExitThisPage: GovukComponentClass;
  export const FileUpload: GovukComponentClass;
  export const Header: GovukComponentClass;
  export const NotificationBanner: GovukComponentClass;
  export const PasswordInput: GovukComponentClass;
  export const Radios: GovukComponentClass;
  export const ServiceNavigation: GovukComponentClass;
  export const SkipLink: GovukComponentClass;
  export const Tabs: GovukComponentClass;
  export const version: string;
}
