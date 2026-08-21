/**
 * Outer wrapper that gates the wizard on the Redux `monomerCreationState`.
 * The internal component is mounted only while the wizard is active, which
 * lets it receive `monomerCreationState` (including `editInstanceInitialValues`
 * used to prefill the form when editing an existing monomer) as a prop and
 * seed its initial reducer state synchronously on mount.
 */
declare const MonomerCreationWizard: () => import("react/jsx-runtime").JSX.Element | null;
export default MonomerCreationWizard;
