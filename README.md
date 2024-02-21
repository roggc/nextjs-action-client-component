# Componente cliente `Action` en NextJS 14

## El problema

En NextJS 14 no se puede llamar a un componente servidor desde un componente cliente:

```javascript
"use client";

// You cannot import a Server Component into a Client Component.
import ServerComponent from "./Server-Component";

export default function ClientComponent({ children }) {
  const [count, setCount] = useState(0);

  return (
    <>
      <button onClick={() => setCount(count + 1)}>{count}</button>

      <ServerComponent />
    </>
  );
}
```

Lo anterior está prohibido, no se puede hacer.

## La solución: componente cliente `Action`

Podemos definir un componente cliente de la siguiente manera:

```javascript
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
  }, [propsChangedKey, action]);

  return JSX;
}
```

donde el hook `usePropsChangedKey` es:

```javascript
import { useState, useEffect } from "react";

export function usePropsChangedKey(...args) {
  const [propsChangedKey, setPropsChangedKey] = useState(0);

  useEffect(() => {
    setPropsChangedKey((k) => k + 1);
  }, [...args]);

  return propsChangedKey;
}
```

Lo que hace el componente cliente `Action` así definido es llamar a la acción servidor ('server action') que le pasemos como propiedad y envolverla en un componente `Suspense` de React. El componente `Suspense` de React tiene la característica de que acepta una promesa como hijo y cuando la promesa se resuelve muestra el resultado. Mientras está en estado `pending` o pendiente, entonces muestra lo que le pasemos en la propiedad `fallback` ('loading ...', etc).

Precisamente una `server action` o acción servidor es una función asíncrona que se ejecuta en servidor y devuelve promesa. Entonces si hacemos que la función asíncrona o `server action` devuelva componente cliente, habremos conseguido simular el llamado a un componente servidor desde cliente, ya que renderizamos un componente cliente previa adquisición de datos en el servidor.

## La acción servidor o `server action`

Aquí muestro un ejemplo de acción servidor:

```javascript
"use server";

import Greeting from "@/app/action-components/greeting";
import MyError from "@/app/action-components/my-error";

const DELAY = 500;

const users = [
  { id: 1, username: "roggc" },
  { id: 2, username: "roger" },
];

export async function greeting({ userId }) {
  try {
    const username = await new Promise((r) => {
      setTimeout(() => {
        const user = users.find((u) => u.id === userId);
        if (user) {
          r(user.username);
        }
      }, DELAY);
    });

    // throw new Error("crash!");
    return <Greeting username={username} />;
  } catch (error) {
    return <MyError errorMessage={error.message} />;
  }
}
```

Esta acción servidor recoje unos datos, en este caso de memoria pero podría ser de una bbdd, y retorna un componente cliente, `Greeting`, pasandole como propiedad el dato recojido. En caso de error retorna otro componente cliente, `MyError`.

## Los componentes cliente retornados por las `server actions`.

Los componentes cliente retornados por las `server actions` son componentes normales y corrientes, cliente en este caso. Aquí tenemos por ejemplo el componente `Greeting` retornado por la `server action` anterior (`greeting`):

```javascript
"use client";

export default function Greeting({ username }) {
  return <>hello {username}</>;
}
```

Es importante siempre comenzar el encabezado de un componente cliente retornado por una `server action` con la directriz `"use client";` porque si no peta. También se puede, si se quiere, retornar un componente servidor desde una `server action` en lugar de un componente cliente.

Como se ve este componente muestra un mensaje en el navegador de 'hello' más el nombre del usuario que le hemos pasado como id a la `server action` `greeting`.

Por completitud muestro como sería el componente cliente `MyError` retornado por la `server action` en caso de error:

```javascript
"use client";

export default function MyError({ errorMessage }) {
  return <>Something went wrong: {errorMessage}</>;
}
```

## Llamada al componente cliente `Action` desde otro componente cliente o componente servidor

El componente cliente `Action` que hemos definido se puede llamar desde un componente cliente o componente servidor. Lo habitual será hacerlo desde componentes cliente.

```javascript
"use client";

import Action from "@/app/action";
import { greeting } from "@/app/actions/greeting";
import { useState } from "react";

export default function Client1() {
  const [userId, setUserId] = useState(1);

  return (
    <>
      <Action action={greeting} userId={userId} />
      <button
        onClick={() => {
          setUserId(2);
        }}
      >
        click
      </button>
    </>
  );
}
```

En este caso estamos llamando al componente `Action` con la acción `greeting` y un `userId`.

El resultado de este componente es que muestra inicialmente un mensaje de `loading...` para después mostrar el texto `hello roggc`. Si clicamos el botón vuelve a mostrar el `loading...` y después muestra `hello roger`.

## Un último paso para que esto funcione

Para que esto funcione hay que importar la `server action` en un componente servidor, puede ser el `Layout` o el `Page` o `Home`.

Con lo que si lo importamos en el `Layout` quedaría así:

```javascript
import { Inter } from "next/font/google";
import { greeting } from "@/app/actions/greeting";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

Esto puede deberse a una especie de bug en NextJS. Si no se pone el import salta un error.
