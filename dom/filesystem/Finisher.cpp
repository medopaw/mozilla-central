/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Finisher.h"
// #include "mozilla/dom/DOMError.h"
#include "Error.h"
#include "Directory.h"

namespace mozilla {
namespace dom {
namespace filesystem {

NS_IMPL_ADDREF(Finisher)
NS_IMPL_RELEASE(Finisher)

Finisher::Finisher(nsPIDOMWindow* aWindow, PromiseResolver* aResovler, ErrorResult& aRv) :
      mWindow(aWindow),
      mResolver(aResovler),
      mRv(aRv)
{
}

Finisher::~Finisher()
{
}

void
Finisher::Success(Directory* aResult)
{
  nsCOMPtr<nsIGlobalObject> globalObject = do_QueryInterface(mWindow);
  if (!globalObject) {
    mRv.Throw(NS_ERROR_FAILURE);
    return;
  }

  AutoSafeJSContext cx;
  JS::Rooted<JSObject*> global(cx, globalObject->GetGlobalJSObject());

  Optional<JS::Handle<JS::Value> > val(cx, OBJECT_TO_JSVAL(aResult->WrapObject(cx, global)));
  mResolver->Resolve(cx, val);
}

void
Finisher::Fail(const nsAString& aError)
{
  AutoSafeJSContext cx;
  JS::Value v;

  if (!xpc::NonVoidStringToJsval(cx, aError, &v)) {
    mRv.Throw(NS_ERROR_FAILURE);
    return;
  }

  Optional<JS::Handle<JS::Value> > val(cx, v);
  mResolver->Reject(cx, val);
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
