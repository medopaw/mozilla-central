/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsCOMPtr.h"

class nsPIDOMWindow;

namespace mozilla {
namespace dom {
namespace filesystem {

class Filesystem MOZ_FINAL
{
public:
NS_DECL_ISUPPORTS

public:
  Filesystem(nsPIDOMWindow* aWindow, const nsAString& aBase);
  ~Filesystem();

  nsPIDOMWindow* Window();

private:
  nsCOMPtr<nsPIDOMWindow> mWindow;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla
