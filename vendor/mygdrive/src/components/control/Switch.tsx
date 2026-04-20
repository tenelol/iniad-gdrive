import type React from "react";
import { Children, isValidElement } from "react";

type CaseProps<T, U extends boolean> = {
  when: T;
  children: U extends true
    ? React.ReactNode
    : (when: NonNullable<T>) => React.ReactNode;
};

type DefaultProps = {
  children: React.ReactNode;
};

export const Case = ({ children }: CaseProps<boolean, true>) => <>{children}</>;
export const DefineCase = <T,>({ children, when }: CaseProps<T, false>) => (
  <>{when && children(when)}</>
);
export const Default: React.FC<DefaultProps> = ({ children }) => (
  <>{children}</>
);

export const Switch = <T,>({ children }: { children: React.ReactNode }) => {
  const childrenArray = Children.toArray(children);

  const match = childrenArray.find((child) => {
    return (
      isValidElement(child) &&
      (child.type === Case || child.type === DefineCase) &&
      Boolean((child.props as CaseProps<T, true>).when)
    );
  });

  const defaultCase = childrenArray.find((child) => {
    return isValidElement(child) && child.type === Default;
  });

  return <>{match || defaultCase}</>;
};
