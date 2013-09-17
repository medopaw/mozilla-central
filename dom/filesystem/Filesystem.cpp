/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Filesystem.h"
#include "nsPIDOMWindow.h"
#include "PathManager.h"

namespace mozilla {
namespace dom {
namespace filesystem {

NS_IMPL_ADDREF(Filesystem)
NS_IMPL_RELEASE(Filesystem)

Filesystem::Filesystem(nsPIDOMWindow* aWindow,
                       const nsAString& aBase)
  : mWindow(aWindow)
    mPathManager(new PathManager(aBase))
{
}

Filesystem::~Filesystem()
{
}

nsPIDOMWindow*
Filesystem::GetWindow()
{
  return mWindow;
}

PathManager*
Filesystem::GetPathManager()
{
  return mPathManager;
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
