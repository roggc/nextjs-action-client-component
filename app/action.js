"use client";

import { Suspense, useState, useEffect } from "react";
import { usePropsChangedKey } from "@/app/hooks";

export default function Action({
  action,
  children = <>loading...</>,
  ...props
}) {
  const [JSX, setJSX] = useState(children);
  const propsChangedKey = usePropsChangedKey(...Object.values(props));

  useEffect(() => {
    setJSX(<Suspense fallback={children}>{action(props)}</Suspense>);
  }, [propsChangedKey]);

  return JSX;
}
