import { Box } from "ink";
import type React from "react";
import { Children, isValidElement } from "react";

type SlotProps = {
  children: React.ReactNode;
};

export const Header: React.FC<SlotProps> = ({ children }) => <>{children}</>;
export const Main: React.FC<SlotProps> = ({ children }) => <>{children}</>;
export const Footer: React.FC<SlotProps> = ({ children }) => <>{children}</>;

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const childrenArray = Children.toArray(children);

  const header = childrenArray.find(
    (child) => isValidElement(child) && child.type === Header,
  );
  const main = childrenArray.find(
    (child) => isValidElement(child) && child.type === Main,
  );
  const footer = childrenArray.find(
    (child) => isValidElement(child) && child.type === Footer,
  );

  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="cyan"
        padding={1}
        marginBottom={1}
        flexDirection="column"
      >
        {header}
      </Box>
      <Box flexDirection="column" minHeight={10}>
        {main}
      </Box>
      <Box
        marginTop={1}
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        borderColor="gray"
        flexDirection="column"
      >
        {footer}
      </Box>
    </Box>
  );
};
