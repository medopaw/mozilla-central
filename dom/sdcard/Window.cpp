/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Window.h"
#include "nsPIDOMWindow.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

nsCOMPtr<nsPIDOMWindow> Window::smWindow = nullptr;

void
Window::SetWindow(nsPIDOMWindow* aWindow)
{
  Window::smWindow = aWindow;
}

nsPIDOMWindow*
Window::GetWindow()
{
  return Window::smWindow.get();
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
