import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";
import type React from "react";

export const Spinner = (
  props: React.PropsWithChildren<{ color?: "green" | "yellow" }>,
) => (
  <Box>
    <Text color={props.color ?? "green"}>
      <InkSpinner type="dots" />
    </Text>
    <Text> </Text>
    <Text color="gray">{props.children ?? "Loading..."}</Text>
  </Box>
);
