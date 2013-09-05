/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsCOMPtr.h"

class nsPIDOMWindow;

namespace mozilla {
namespace dom {
namespace filesystem {

/*
 * This class is to hold window instance for GetParentObject().
 * All methods in this class are static.
 */
class Window
{
public:
  static void SetWindow(nsPIDOMWindow* aWindow);
  static nsPIDOMWindow* GetWindow();

private:
  static nsCOMPtr<nsPIDOMWindow> msWindow;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla
